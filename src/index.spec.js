import expect from 'expect.js';
import AsynchronousTypeProcessor from './index';

const TYPE_MAP = {
  String: value => value,
  Contact: {
    fields: {
      firstName: {
        type: 'String'
      }
    }
  }
};

let atp;

module.exports = {
  AsynchronousTypeProcessor: {
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
      'should return a Function for a primitive type validator': async () => {
        const ptv = await atp.getTypeDefinition('String');

        expect(ptv).to.be.a(Function);
      },
      'should return a type definition for a valid typeName': async () => {
        const ptv = await atp.getTypeDefinition('Contact');

        expect(ptv).to.be.an(Object);
      }
    }
  }
};
