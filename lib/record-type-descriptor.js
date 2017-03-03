'use strict';

const PropertiesContainer = require('./properties-container.js');


/**
 * Record type descriptor.
 *
 * @memberof module:x2node-records
 * @inner
 * @extends module:x2node-records~PropertiesContainer
 */
class RecordTypeDescriptor extends PropertiesContainer {

	/**
	 * <b>The constructor is not accessible from the client code. Record type
	 * descriptors are created internally and are available via the record type
	 * library's
	 * [getRecordTypeDesc]{@link module:x2node-records~RecordTypesLibrary#getRecordTypeDesc}
	 * method.</b>
	 *
	 * @param {(string|Symbol)} recordTypeName Record type name.
	 * @param {Object} recordTypeDef Record type definition.
	 * @throws {module:x2node-common.X2UsageError} If the definition is invalid.
	 */
	constructor(recordTypeName, recordTypeDef) {
		super(recordTypeName, '', recordTypeDef);
	}

	/**
	 * Record type name (same as <code>recordTypeName</code> property inherited
	 * from the properties container).
	 *
	 * @type {(string|Symbol)}
	 * @readonly
	 */
	get name() { return this.recordTypeName; }
}

// export the class
module.exports = RecordTypeDescriptor;
