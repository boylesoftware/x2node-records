'use strict';

const common = require('x2node-common');


/**
 * Get invalid property definition error.
 *
 * @private
 * @param {module:x2node-records~PropertyDescriptor} propDesc Property
 * descriptor.
 * @param {string} msg Error message.
 * @returns {module:x2node-common.X2UsageError} Error to throw.
 */
function invalidPropDef(propDesc, msg) {
	return new common.X2UsageError(
		'Property ' + propDesc.container.nestedPath + propDesc.name +
			' of record type ' + String(propDesc.container.recordTypeName) +
			' has invalid definition: ' + msg);
}

/**
 * Extension that implements the core functionaity.
 *
 * @protected
 * @memberof module:x2node-records
 * @inner
 * @implements {module:x2node-records.Extension}
 */
class CoreExtention {

	// extend properties containers
	extendPropertiesContainer(ctx, container) {

		// add container definition completion tasks
		ctx.onContainerComplete(container => {

			// find the id property
			let idPropName;
			for (let propName of container.allPropertyNames) {
				if (container.getPropertyDesc(propName).isId()) {
					if (idPropName)
						throw new common.X2UsageError(
							'Record type ' + String(container.recordTypeName) + (
								container.nestedPath.length > 0 ?
									' property ' + container.nestedPath : '') +
								' has more than one id property.');
					idPropName = propName;
				}
			}
			if (idPropName)
				container._idPropName = idPropName;
		});

		// add container validation
		ctx.onLibraryValidation(() => {

			// validate record type name
			if (container.isRecordType() &&
				((typeof container.recordTypeName) === 'string') &&
				(container.recordTypeName.indexOf('#') >= 0))
				throw new common.X2UsageError(
					'Invalid record type name ' + container.recordTypeName +
						': may not contain hashes.');

			// validate factory function
			if ((typeof container.newRecord) !== 'function')
				throw new common.X2UsageError(
					'Record type ' + String(container.recordTypeName) + (
						container.isRecordType() ? '' :
							' nested object property ' + container.nestedPath) +
						' has factory specified, but it is not a function.');

			// validate id property presence for record type
			if (container.isRecordType() && !container.idPropertyName)
				throw new common.X2UsageError(
					'Record type ' + String(container.recordTypeName) +
						' does not have an id property.');

			// validate presence of subtypes for polymoprhic container
			if (container.isPolymorph()) {
				if (container.subtypes.length === 0)
					throw new common.X2UsageError(
						'Polymoprhic ' + (
								container.isRecordType() ?
									'record type ' :
									' nested object property ' +
										container.nestedPath + ' of record type '
							) + String(container.recordTypeName) +
							' does not have any subtypes.');
			}

			// validate type property for polymoprhic object container
			if (container.isPolymorphObject()) {
				if ((typeof container.typePropertyName) !== 'string')
					throw new common.X2UsageError(
						'Polymoprhic ' + (
								container.isRecordType() ?
									'record type ' :
									' nested object property ' +
										container.nestedPath + ' of record type '
							) + String(container.recordTypeName) +
							' does not have type property name specified.');
			}
		});

		// return the container
		return container;
	}

	// extend property descriptors
	extendPropertyDescriptor(ctx, propDesc) {

		// get the definition
		const propDef = propDesc.definition;

		// process reference property
		if (propDesc._scalarValueType === 'ref') {

			// extract and validate reference target record type(s)
			const refTargets = propDesc._refTarget.split('|');

			// check if polymorphic
			if ((refTargets.length > 1)) {

				// change scalar value type for polymorphic nested container
				propDesc._scalarValueType = 'object';
				delete propDesc._refTarget;

				// create polymorphic nested container
				const supertypeDef = Object.create(propDef);
				supertypeDef.subtypes = refTargets;
				propDesc._nestedProperties = ctx.createPropertiesContainer(
					propDesc, supertypeDef);

			} else { // non-polymorphic reference

				// lookup target record type upon library completion
				ctx.onLibraryComplete(recordTypes => {
					if (!recordTypes.hasRecordType(propDesc.refTarget))
						throw invalidPropDef(
							propDesc, 'unknown reference target record type.');
					propDesc._nestedProperties = recordTypes.getRecordTypeDesc(
						propDesc.refTarget);
				});
			}
		}

		// process nested object property
		else if (propDesc._scalarValueType === 'object') {

			// get/create nested properties container
			if (propDesc._viewOfDesc) {
				propDesc._nestedProperties =
					propDesc._viewOfDesc._nestedProperties;
			} else {
				if (!propDef.properties && !propDef.subtypes)
					throw invalidPropDef(propDesc, 'missing properties.');
				propDesc._nestedProperties = ctx.createPropertiesContainer(
					propDesc, propDef);
			}
		}

		// create nested properties container for simple values collection
		if ((propDesc._scalarValueType !== 'object') &&
			(propDesc._scalarValueType !== 'ref')) {
			if (propDesc._isScalar)
				propDesc._nestedProperties = null;
			else
				propDesc._nestedProperties = ctx.createPropertiesContainer(
					propDesc, {
						properties: {
							'$value': {
								valueType: propDesc._scalarValueType
							}
						}
					});
		}

		// add property descriptor validation
		ctx.onLibraryValidation(() => {

			// validate id property
			if (propDesc.isId()) {
				if (!propDesc.isScalar() || (
					(propDesc.scalarValueType !== 'number') &&
						(propDesc.scalarValueType !== 'string')) ||
					propDesc.optional || propDesc.modifiable)
					throw invalidPropDef(
						propDesc, 'id property must be a scalar, required,' +
							' non-modifiable number or string.');
			}

			// ensure view is not modifiable
			if (propDesc.isView() && propDesc.modifiable)
				throw invalidPropDef(propDesc, 'view may not be modifiable.');
		});

		// add properties and methods to the descriptor:

		/**
		 * A shortcut method that tells if the property is a polymoprhic
		 * nested object property. Such property will have
		 * <code>scalarValueType</code> of "object" and its
		 * <code>nestedProperties.isPolymorphObject()</code> will return
		 * <code>true</code>.
		 *
		 * @function module:x2node-records~PropertyDescriptor#isPolymorphObject
		 * @returns {boolean} <code>true</code> if polymorphic nested object
		 * property.
		 */
		propDesc.isPolymorphObject = function() {
			return (
				this._nestedProperties &&
					this._nestedProperties.isPolymorphObject());
		};

		/**
		 * A shortcut method that tells if the property is a polymoprhic
		 * reference property. Such property will have
		 * <code>scalarValueType</code> of "object" and its
		 * <code>nestedProperties.isPolymorphRef()</code> will return
		 * <code>true</code>.
		 *
		 * @function module:x2node-records~PropertyDescriptor#isPolymorphRef
		 * @returns {boolean} <code>true</code> if polymorphic reference
		 * property.
		 */
		propDesc.isPolymorphRef = function() {
			return (
				this._nestedProperties &&
					this._nestedProperties.isPolymorphRef());
		};

		/**
		 * For a polymoprhic reference property, a shortcut property that
		 * contains a list of names of all allowed referred record types. This is
		 * a shortcut for <code>nestedProperties.subtypes</code>.
		 *
		 * @member {Array.<string>=} module:x2node-records~PropertyDescriptor#refTargets
		 * @readonly
		 */
		Object.defineProperty(propDesc, 'refTargets', {
			get() {
				return (
					this._nestedProperties &&
						this._nestedProperties.isPolymorphRef() &&
						this._nestedProperties.subtypes());
			}
		});

		/**
		 * For a nested object property (<code>scalarValueType</code> is
		 * "object"), the descriptors of the nested properties. For a reference
		 * property (<code>scalarValueType</code> is "ref"), the target record
		 * type descriptor. For a non-object, non-reference property, if it is
		 * not scalar the container describes a single property named "$value"
		 * with the scalar value type. If it is scalar, the
		 * <code>nestedProperties</code> value is <code>null</code>. For a
		 * polymorphic nested object or reference property, this is the
		 * polymoprhic container.
		 *
		 * @member {?module:x2node-records~PropertiesContainer} module:x2node-records~PropertyDescriptor#nestedProperties
		 * @readonly
		 */
		Object.defineProperty(propDesc, 'nestedProperties', {
			get() { return this._nestedProperties; }
		});

		// return the descriptor
		return propDesc;
	}
}

// export the class
module.exports = CoreExtention;
