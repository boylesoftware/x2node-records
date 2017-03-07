/**
 * Record types library module.
 *
 * @module x2node-records
 */
'use strict';

const RecordTypesLibraryFactory = require(
	'./lib/record-types-library-factory.js');


/**
 * Create record types library factory.
 *
 * @param {...module:x2node-records.Extension} [extensions] Extensions.
 * @returns {module:x2node-records~RecordTypesLibraryFactory} Record types
 * library factory.
 */
exports.createLibraryFactory = function() {

	const factory = new RecordTypesLibraryFactory();

	for (let i = 0, len = arguments.length; i < len; i++)
		factory.addExtension(arguments[i]);

	return factory;
};
