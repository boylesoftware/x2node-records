/**
 * Record types library module.
 *
 * @module x2node-records
 */
'use strict';

const RecordTypesLibraryFactory = require(
	'./lib/record-types-library-factory.js');


/**
 * Build record types library using the provided definitions. This is a shortcut
 * function that allows creating record types libraries that do not use any
 * extensions.
 *
 * @param {Object} recordTypeDefs Record type definitions.
 * @returns {module:x2node-records~RecordTypesLibrary} Record types library.
 * @throws {module:x2node-common.X2UsageError} If any record type definitions
 * are found invalid.
 */
exports.buildLibrary = function(recordTypeDefs) {

	return (new RecordTypesLibraryFactory()).buildLibrary(recordTypeDefs);
};

/**
 * Create record types library builder with the specified extensions.
 *
 * @param {...module:x2node-records.Extension} [extensions] Extensions.
 * @returns {module:x2node-records~RecordTypesLibraryFactory} Record types
 * library builder.
 */
exports.with = function() {

	const factory = new RecordTypesLibraryFactory();

	for (let i = 0, len = arguments.length; i < len; i++)
		factory.addExtension(arguments[i]);

	return factory;
};
