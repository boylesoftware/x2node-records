'use strict';

const expect = require('chai').expect;

const records = require('../index.js');

describe('x2node-records', function() {
	describe('.buildLibrary()', function() {
		it('should return RecordTypesLibrary', function() {
			expect(records.buildLibrary({})).to.be.ok;
		});
	});
});
