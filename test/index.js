'use strict';

const expect = require('chai').expect;

const records = require('../index.js');


const TEST_LIB = {
	recordTypes: {
		'Record1': {
			properties: {
				'id': {
					valueType: 'number',
					role: 'id'
				}
			}
		}
	}
};


describe('x2node-records', function() {

	describe('.buildLibrary()', function() {

		it('should return RecordTypesLibrary', function() {
			expect(records.buildLibrary({})).to.be.ok;
		});

	});

	describe('RecordTypesLibrary', function() {

		const recordTypes = records.buildLibrary(TEST_LIB);
		it('should have Record1', function() {
			expect(recordTypes.hasRecordType('Record1')).to.be.true;
		});

		const recordTypeDesc = recordTypes.getRecordTypeDesc('Record1');
		describe('RecordTypeDescriptor', function() {
			it('should have id property', function() {
				expect(recordTypeDesc.idPropertyName).to.equal('id');
			});
		});
	});
});
