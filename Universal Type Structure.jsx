// UTS
// Type Map
export default {
  PrimitiveType: {
    name: 'PrimitiveType',
    label: 'Primitive Type',
    primitive: true
  },
  AnotherType: {
    name: 'AnotherType',
    label: 'Another Type',
    remote: true
  },
  TypeName: {
    name: 'TypeName',
    label: 'Type Label',
    features: { // type level configuration for specific systems using the type map
      feature1: {
        configParam1: true,
        configParam2: 'anything'
      },
      feature2: {}
    },
    fields: {
      fieldName1: {
        type: 'AnotherType',
        label: 'Field Label',
        // multiple: true, // for nested arrays
        // embedded: true, // for embedded objects or arrays
        features: { // field level configuration for specific systems using the type map
          feature1: {
            configParam1: true,
            configParam2: 'anything'
          },
          feature2: {}
        }
      },
      fieldName2: {}
    }
  }
};
