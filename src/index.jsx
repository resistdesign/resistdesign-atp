/**
 * An asynchronous, generic data type processor.
 * @param {Object} config An object with properties to be assigned to the new
 * instance.
 * */
export default class AbstractTypeProcessor {
  static ERROR_MESSAGES = {
    NON_EXISTENT_TYPE: 'NON_EXISTENT_TYPE',
    NON_EXISTENT_FIELD: 'NON_EXISTENT_FIELD',
    MISSING_FIELDS_FOR_TYPE: 'MISSING_FIELDS_FOR_TYPE',
    ITEM_ERROR: 'ITEM_ERROR',
    VALUE_LIST_ERROR: 'VALUE_LIST_ERROR',
    INVALID_VALUE_LIST: 'INVALID_VALUE_LIST',
    INVALID_ITEM: 'INVALID_ITEM'
  };

  /**
   * Check to see if a value exists.
   * @param {*} value The value to check.
   * @returns {boolean} A flag designating whether or not the value exists.
   * */
  static valueExists (value) {
    return !(typeof value === 'undefined' || value === null);
  }

  /**
   * A map with type name keys and type definition values.
   * @member {Object.<string, Object>}
   * */
  typeMap = {};

  constructor (config = {}) {
    Object.assign(this, config);
  }

  /**
   * Get a type definition by name.
   * @param {string} typeName The name of the type.
   * @returns {Object} A type definition.
   * */
  async getTypeDefinition (typeName) {
    if (this.typeMap instanceof Object) {
      const typeDefinition = this.typeMap[typeName];

      if (typeDefinition instanceof Object) {
        return typeDefinition;
      }
    }

    throw new TypeError(
      AbstractTypeProcessor.ERROR_MESSAGES.NON_EXISTENT_TYPE
    );
  }

  /**
   * Get the list of defined field names for a type by name.
   * @param {string} typeName The name of the type.
   * @returns {Array.<string>} The list of field names.
   * */
  async getFieldList (typeName) {
    const typeDefinition = await this.getTypeDefinition(typeName);
    const { fields } = typeDefinition;

    if (fields instanceof Object) {
      return Object.keys(fields);
    }

    throw new TypeError(
      AbstractTypeProcessor.ERROR_MESSAGES.MISSING_FIELDS_FOR_TYPE
    );
  }

  /**
   * Get a field descriptor by type and field name.
   * @param {string} typeName The name of the type.
   * @param {string} fieldName The name of the field.
   * @returns {Object} A field descriptor.
   * */
  async getFieldDescriptor (typeName, fieldName) {
    const typeDefinition = await this.getTypeDefinition(typeName);
    const { fields } = typeDefinition;

    if (fields instanceof Object) {
      const f = fields[fieldName];

      if (f instanceof Object) {
        return f;
      }
    }

    throw new TypeError(
      AbstractTypeProcessor.ERROR_MESSAGES.NON_EXISTENT_FIELD
    );
  }

  /**
   * Get a feature configuration for the specified type and feature name.
   * @param {string} typeName The name of the type.
   * @param {string} featureName The name of the feature.
   * @returns {Object} The feature configuration or `undefined` if none exists.
   * */
  async getTypeFeature (typeName, featureName) {
    const typeDefinition = await this.getTypeDefinition(typeName);
    const { features = {} } = typeDefinition;

    return features[featureName];
  }

  /**
   * Get a feature configuration for the specified type, field and feature name.
   * @param {string} typeName The name of the type.
   * @param {string} fieldName The name of the field.
   * @param {string} featureName The name of the feature.
   * @returns {Object} The feature configuration or `undefined` if none exists.
   * */
  async getFieldFeature (typeName, fieldName, featureName) {
    const fieldDescriptor = await this.getFieldDescriptor(typeName, fieldName);
    const { features = {} } = fieldDescriptor;

    return features[featureName];
  }

  /**
   * Process a primitive value.
   * @abstract
   * @param {Object} input The input for the method.
   * @param {*} input.value The value to process.
   * @param {string} input.typeName The name of the type.
   * @returns {*} The processed value.
   * */
  async processPrimitiveValue (input) {
    const { value, typeName } = input;

    return value;
  }

  /**
   * Process a remote value.
   * @abstract
   * @param {Object} input The input for the method.
   * @param {*} input.value The value to process.
   * @param {string} input.typeName The name of the type.
   * @returns {*} The processed value.
   * */
  async processRemoteValue (input) {
    const { value, typeName } = input;

    return value;
  }

  /**
   * Process a value.
   * @param {Object} input The input for the method.
   * @param {*} input.value The value to process.
   * @param {string} input.typeName The name of the type of the value.
   * @returns {*} The processed value.
   * */
  async processValue (input) {
    const { value, typeName } = input;
    const typeDefinition = await this.getTypeDefinition(typeName);
    const { primitive, remote } = typeDefinition;

    let newValue;

    if (primitive) {
      newValue = await this.processPrimitiveValue({
        ...input,
        value,
        typeName
      });
    } else if (remote) {
      newValue = await this.processRemoteValue({
        ...input,
        value,
        typeName
      });
    } else {
      newValue = await this.processItem({
        ...input,
        item: value,
        typeName
      });
    }

    return newValue;
  }

  /**
   * Process a list of values.
   * @param {Object} input The input for the method.
   * @param {Array.<*>} input.valueList The list of values to process.
   * @param {string} input.typeName The name of the type of the values.
   * @returns {Array} The list of processed values.
   * */
  async processValueList (input) {
    const { valueList, typeName } = input;

    if (valueList instanceof Array) {
      const newList = [];
      const errorIndices = {};

      for (let i = 0; i < valueList.length; i++) {
        const value = valueList[i];

        try {
          newList.push(await this.processValue({
            ...input,
            value,
            typeName
          }));
        } catch (error) {
          errorIndices[i] = error;
        }
      }

      if (Object.keys(errorIndices).length) {
        const typeError = new TypeError(
          AbstractTypeProcessor.ERROR_MESSAGES.VALUE_LIST_ERROR
        );

        typeError.indices = errorIndices;

        throw typeError;
      }

      return newList;
    } else if (!AbstractTypeProcessor.valueExists(valueList)) {
      return valueList;
    }

    throw new TypeError(
      AbstractTypeProcessor.ERROR_MESSAGES.INVALID_VALUE_LIST
    );
  }

  /**
   * Process a value for the given field of a given type.
   * @param {Object} input The input for the method.
   * @param {*} input.value The value to process.
   * @param {string} input.typeName The name of the type.
   * @param {string} input.fieldName The name of the field.
   * @returns {*} The processed value.
   * */
  async processFieldValue (input) {
    const { value, typeName, fieldName } = input;

    const fieldDescriptor = await this.getFieldDescriptor(typeName, fieldName);
    const { type: fieldTypeName, multiple } = fieldDescriptor;

    let newValue;

    if (multiple) {
      newValue = await this.processValueList({
        ...input,
        valueList: value,
        typeName: fieldTypeName
      });
    } else {
      newValue = await this.processValue({
        ...input,
        value,
        typeName: fieldTypeName
      });
    }

    return newValue;
  }

  /**
   * Process an item of a given type.
   * @param {Object} input The input for the method.
   * @param {Object|*} input.item The item to process.
   * @param {string} input.typeName The name of the type.
   * @returns {Object|*} The processed item.
   * */
  async processItem (input) {
    const { item, typeName } = input;

    if (item instanceof Object) {
      const fieldList = await this.getFieldList(typeName);
      const newItem = {};
      const errorFields = {};

      for (let i = 0; i < fieldList.length; i++) {
        const fieldName = fieldList[i];
        const value = item[fieldName];

        try {
          newItem[fieldName] = await this.processFieldValue({
            ...input,
            value,
            typeName,
            fieldName
          });
        } catch (error) {
          errorFields[fieldName] = error;
        }
      }

      if (Object.keys(errorFields).length) {
        const itemError = new TypeError(
          AbstractTypeProcessor.ERROR_MESSAGES.ITEM_ERROR
        );

        itemError.fields = errorFields;

        throw itemError;
      }

      return newItem;
    } else if (!AbstractTypeProcessor.valueExists(item)) {
      return item;
    }

    throw new TypeError(
      AbstractTypeProcessor.ERROR_MESSAGES.INVALID_ITEM
    );
  }
}
