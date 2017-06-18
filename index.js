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
    ITEM_LIST_ERROR: 'ITEM_LIST_ERROR',
  };

  typeMap = {};

  constructor (config) {
    Object.assign(this, config);
  }

  /**
   * Get a type definition by name.
   * @param {string} typeName The name of the type.
   * @returns {Object|Function} A type definition or a primitive type
   * validator.
   * */
  getTypeDefinition = async (typeName) => {
    if (this.typeMap instanceof Object) {
      const typeDefinition = this.typeMap[typeName];

      if (
        typeDefinition instanceof Function ||
        typeDefinition instanceof Object
      ) {
        return typeDefinition;
      }
    }

    throw new TypeError(
      AsynchronousTypeProcessor.ERROR_MESSAGES.NON_EXISTENT_TYPE
    );
  };

  /**
   * Get the list of define field names for a type by name.
   * @param {string} typeName The name of the type.
   * @returns {Array.<string>} The list of field names.
   * */
  getFieldList = async (typeName) => {
    const typeDefinition = await this.getTypeDefinition(typeName);
    const { fields } = typeDefinition;

    if (fields instanceof Object) {
      return Object.keys(fields);
    }

    throw new TypeError(
      AsynchronousTypeProcessor.ERROR_MESSAGES.MISSING_FIELDS_FOR_TYPE
    );
  };

  /**
   * Get a field descriptor by type and field name.
   * @param {string} typeName The name of the type.
   * @param {string} fieldName The name of the field.
   * @returns {Object|Function} A field descriptor or a primitive type validator
   * if the type definition for the given type name is a primitive type
   * validator.
   * */
  getFieldDescriptor = async (typeName, fieldName) => {
    const typeDefinition = await this.getTypeDefinition(typeName);

    if (typeDefinition instanceof Function) {
      return typeDefinition;
    } else {
      const { fields } = typeDefinition;

      if (fields instanceof Object) {
        const f = fields[fieldName];

        if (f instanceof Object) {
          return f;
        }
      }
    }

    throw new TypeError(
      AsynchronousTypeProcessor.ERROR_MESSAGES.NON_EXISTENT_FIELD
    );
  };

  /**
   * Process a value for the given field of a given type.
   * @param {*} value The value to process.
   * @param {string} typeName The name of the type.
   * @param {string} fieldName The name of the field.
   * @returns {*} The processed value.
   * */
  processValue = async (value, typeName, fieldName) => {
    const fieldDescriptor = await this.getFieldDescriptor(typeName, fieldName);

    if (fieldDescriptor instanceof Function) {
      return await fieldDescriptor(value, typeName, fieldName);
    } else {
      if (fieldDescriptor.multiple) {
        return await this.processItemList(value, fieldDescriptor.type);
      } else {
        return await this.processItem(value, fieldDescriptor.type);
      }
    }
  };

  /**
   * Process a list of items of a given type.
   * @param {Array} itemList The list of items to process.
   * @param {string} typeName The name of the type.
   * @returns {Array} The processed list of items.
   * */
  processItemList = async (itemList, typeName) => {
    if (itemList instanceof Array) {
      const newItems = [];
      const itemListError = new TypeError(
        AsynchronousTypeProcessor.ERROR_MESSAGES.ITEM_LIST_ERROR
      );
      itemListError.indices = {};

      for (let i = 0; i < itemList.length; i++) {
        const item = itemList[i];

        try {
          newItems.push(await this.processItem(item, typeName));
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
  };

  /**
   * Process an item for of a given type.
   * @param {Object|*} item The item to process.
   * @param {string} typeName The name of the type.
   * @returns {Object|*} The processed item or miscellaneous value when the type
   * definition for the given type is a primitive type validator.
   * */
  processItem = async (item, typeName) => {
    const typeDefinition = await this.getTypeDefinition(typeName);
    const fieldList = await this.getFieldList(typeName);

    if (typeDefinition instanceof Function) {
      return await this.processValue(item, typeName);
    } else if (item instanceof Object) {
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
            newItem[fieldName] = await this.processValue(
              value,
              typeName,
              fieldName
            );
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
  };
}
