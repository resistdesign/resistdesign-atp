import expect from 'expect.js';
import AsynchronousTypeProcessor from './index';

const TYPE_MAP = {
  String: {
    name: 'String',
    label: 'A Single Line Of Text',
    primitive: true
  },
  Address: {
    remote: true
  },
  Contact: {
    fields: {
      firstName: {
        type: 'String'
      },
      address: {
        type: 'Address'
      }
    }
  }
};

let atp,
  extendedInstance,
  primitiveValueFromExtendedInstance,
  remoteValueFromExtendedInstance;

module.exports = {
  AsynchronousTypeProcessor: {
    afterEach: () => {
      atp = undefined;
      extendedInstance = undefined;
      primitiveValueFromExtendedInstance = undefined;
      remoteValueFromExtendedInstance = undefined;
    },
    'should be a class': () => {
      expect(AsynchronousTypeProcessor).to.be.a(Function);
    },
    getTypeDefinition: {
      beforeEach: () => {
        atp = new AsynchronousTypeProcessor({
          typeMap: TYPE_MAP
        });
      },
      'should be a function': () => {
        expect(atp.getTypeDefinition).to.be.a(Function);
      },
      'should throw a TypeError for an invalid typeName': async () => {
        let error;

        try {
          await atp.getTypeDefinition('InvalidType');
        } catch (e) {
          error = e;
        }

        expect(error).to.be.a(TypeError);
        expect(error.message).to.equal(
          AsynchronousTypeProcessor.ERROR_MESSAGES.NON_EXISTENT_TYPE
        );
      },
      'should return a type definition for a valid typeName': async () => {
        const ptv = await atp.getTypeDefinition('Contact');

        expect(ptv).to.be.an(Object);
      }
    },
    processItem: {
      beforeEach: () => {
        class ATPExtendedClass extends AsynchronousTypeProcessor {
          async processPrimitiveValue ({ value }) {
            primitiveValueFromExtendedInstance = value;
            return value;
          }

          async processRemoteValue ({ value }) {
            remoteValueFromExtendedInstance = value;
            return value;
          }
        }

        extendedInstance = new ATPExtendedClass({
          typeMap: TYPE_MAP
        });
        primitiveValueFromExtendedInstance = undefined;
        remoteValueFromExtendedInstance = undefined;
      },
      [`should process types marked as primitive
      by calling processPrimitiveValue`]: async () => {
        await extendedInstance.processItem({
          item: {
            firstName: 'First'
          },
          typeName: 'Contact'
        });

        expect(primitiveValueFromExtendedInstance).to.equal('First');
      },
      [`should process types marked as remote
      by calling processRemoteValue`]: async () => {
        const line1 = '123 Main St.';
        await extendedInstance.processItem({
          item: {
            address: {
              line1
            }
          },
          typeName: 'Contact'
        });

        expect(remoteValueFromExtendedInstance.line1).to.equal(line1);
      }
    }
  }
};
