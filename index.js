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
