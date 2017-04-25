'use strict';

const common = require('x2node-common');

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
	 * <strong>Note:</strong> The constructor is not accessible from the client
	 * code. Record type descriptors are created internally and are available via
	 * the record type library's
	 * [getRecordTypeDesc()]{@link module:x2node-records~RecordTypesLibrary#getRecordTypeDesc}
	 * method.
	 *
	 * @protected
	 * @param {(string|Symbol)} recordTypeName Record type name.
	 * @param {Object} recordTypeDef Record type definition.
	 */
	constructor(recordTypeName, recordTypeDef) {
		super(recordTypeName, '', recordTypeDef, null);
	}

	/**
	 * Record type name (same as <code>recordTypeName</code> property inherited
	 * from the properties container).
	 *
	 * @member {(string|Symbol)}
	 * @readonly
	 */
	get name() { return this.recordTypeName; }

	/**
	 * Convert reference to a record of this record type to the record id.
	 *
	 * @param {string} ref Record reference.
	 * @returns {(string|number)} Record id.
	 * @throws {module:x2node-common.X2SyntaxError} If reference has invalid
	 * syntax.
	 */
	refToId(ref) {

		if (((typeof ref) !== 'string') ||
			!ref.startsWith(this.recordTypeName + '#') ||
			(ref.indexOf('#') === ref.length - 1))
			throw new common.X2SyntaxError(
				`Invalid ${this.recordTypeName} record reference.`);

		const idPropDesc = this.getPropertyDesc(this.idPropertyName);
		if (idPropDesc.scalarValueType === 'string')
			return ref.substring(this.recordTypeName.length + 1);

		const id = Number(ref.substring(this.recordTypeName.length + 1));
		if (!Number.isFinite(id))
			throw new common.X2SyntaxError(
				`Invalid ${this.recordTypeName} record reference.`);

		return id;
	}
}

// export the class
module.exports = RecordTypeDescriptor;
