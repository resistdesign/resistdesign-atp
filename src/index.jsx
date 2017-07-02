/**
 * An asynchronous, generic data type processor.
 * @param {Object} config An object with properties to be assigned to the new
 * instance.
 * */
export default class AsynchronousTypeProcessor {
  static ERROR_MESSAGES = {
    NON_EXISTENT_TYPE: 'NON_EXISTENT_TYPE',
    NON_EXISTENT_FIELD: 'NON_EXISTENT_FIELD',
    MISSING_FIELDS_FOR_TYPE: 'MISSING_FIELDS_FOR_TYPE',
    ITEM_ERROR: 'ITEM_ERROR',
    ITEM_LIST_ERROR: 'ITEM_LIST_ERROR'
  };

  /**
   * A map with type name keys and type definition values.
   * @member {Object.<string, Object>}
   * */
  typeMap = {};

  constructor (config) {
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
      AsynchronousTypeProcessor.ERROR_MESSAGES.NON_EXISTENT_TYPE
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
      AsynchronousTypeProcessor.ERROR_MESSAGES.MISSING_FIELDS_FOR_TYPE
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
      AsynchronousTypeProcessor.ERROR_MESSAGES.NON_EXISTENT_FIELD
    );
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
   * @param {*} value The value to process.
   * @param {string} typeName The name of the type.
   * @param {string|number} key The name of the field or the index.
   * @returns {*} The processed value.
   * */
  async processPrimitiveValue (value, typeName, key) {
    return value;
  }

  /**
   * Process a remote value.
   * @abstract
   * @param {*} value The value to process.
   * @param {string} typeName The name of the type.
   * @param {string|number} key The name of the field or the index.
   * @returns {*} The processed value.
   * */
  async processRemoteValue (value, typeName, key) {
    return value;
  }

  /**
   * Process a value for the given field of a given type.
   * @param {*} value The value to process.
   * @param {string} typeName The name of the type.
   * @param {string} fieldName The name of the field.
   * @returns {*} The processed value.
   * */
  async processFieldValue (value, typeName, fieldName) {
    const fieldDescriptor = await this.getFieldDescriptor(typeName, fieldName);
    const { type: fieldTypeName, multiple } = fieldDescriptor;
    const fieldTypeDefinition = await this.getTypeDefinition(fieldTypeName);
    const { primitive, remote } = fieldTypeDefinition;

    if (primitive) {
      return await this.processPrimitiveValue(value, typeName, fieldName);
    } else if (remote) {
      return await this.processRemoteValue(value, typeName, fieldName);
    } else if (multiple) {
      return await this.processItemList(value, fieldTypeName);
    } else {
      return await this.processItem(value, fieldTypeName);
    }
  }

  /**
   * Process a list of items of a given type.
   * @param {Array} itemList The list of items to process.
   * @param {string} typeName The name of the type.
   * @returns {Array} The processed list of items.
   * */
  async processItemList (itemList, typeName) {
    const typeDefinition = await this.getTypeDefinition(typeName);
    const { primitive, remote } = typeDefinition;

    if (itemList instanceof Array) {
      const newItems = [];
      const itemListError = new TypeError(
        AsynchronousTypeProcessor.ERROR_MESSAGES.ITEM_LIST_ERROR
      );
      itemListError.indices = {};

      for (let i = 0; i < itemList.length; i++) {
        const item = itemList[i];

        try {
          if (primitive) {
            newItems.push(await this.processPrimitiveValue(item, typeName, i));
          } else if (remote) {
            newItems.push(await this.processRemoteValue(item, typeName, i));
          } else {
            newItems.push(await this.processItem(item, typeName));
          }
        } catch (error) {
          newItems.push(null);
          itemListError.indices[i] = error;
        }
      }

      if (Object.keys(itemListError.indices).length) {
        throw itemListError;
      }

      return newItems;
    } else {
      return itemList;
    }
  }

  /**
   * Process an item of a given type.
   * @param {Object|*} item The item to process.
   * @param {string} typeName The name of the type.
   * @returns {Object|*} The processed item or miscellaneous value when the type
   * definition for the given type is a primitive type validator.
   * */
  async processItem (item, typeName) {
    const typeDefinition = await this.getTypeDefinition(typeName);
    const { primitive, remote } = typeDefinition;

    if (item instanceof Object) {
      const fieldList = await this.getFieldList(typeName);
      const newItem = {};
      const itemError = new TypeError(
        AsynchronousTypeProcessor.ERROR_MESSAGES.ITEM_ERROR
      );
      itemError.fields = {};

      if (fieldList instanceof Array) {
        for (let i = 0; i < fieldList.length; i++) {
          const fieldName = fieldList[i];
          const value = item[fieldName];

          try {
            let processedValue;

            if (primitive) {
              processedValue = await this.processPrimitiveValue(
                value,
                typeName,
                fieldName
              );
            } else if (remote) {
              processedValue = await this.processRemoteValue(
                value,
                typeName,
                fieldName
              );
            } else {
              processedValue = await this.processFieldValue(
                value,
                typeName,
                fieldName
              );
            }

            newItem[fieldName] = processedValue;
          } catch (error) {
            itemError.fields[fieldName] = error;
          }
        }
      }

      if (Object.keys(itemError.fields).length) {
        throw itemError;
      }

      return newItem;
    } else {
      return item;
    }
  }
}
