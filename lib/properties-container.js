'use strict';

const common = require('x2node-common');


/**
 * Subtype property marker.
 *
 * @private
 * @constant {Symbol}
 */
const SUBTYPE = Symbol('SUBTYPE');


/**
 * Descriptor of an entity that has properties, such as record type or a nested
 * object property.
 *
 * @memberof module:x2node-records
 * @inner
 */
class PropertiesContainer {

	/**
	 * <strong>Note:</strong> The constructor is not accessible from the client
	 * code. Container instances are created internally and are made available
	 * via other descriptor objects.
	 *
	 * @protected
	 * @param {(string|Symbol)} recordTypeName Name of the record type, to which
	 * the container belongs (name of the record type if the container
	 * <em>is</em> itself the record type).
	 * @param {string} nestedPath Dot-separated path to the property represented
	 * by the container ending with a dot, or empty string if the container is
	 * the record type descriptor.
	 * @param {Object} containerDef Container definition.
	 * @param {?module:x2node-records~PropertiesContainer} parentContainer Parent
	 * container, or <code>null</code> if record type.
	 */
	constructor(recordTypeName, nestedPath, containerDef, parentContainer) {

		// save the basics
		this._recordTypeName = recordTypeName;
		this._nestedPath = nestedPath;
		this._definition = containerDef;
		this._parentContainer = parentContainer;

		// container for properties
		this._propNames = new Array();
		this._propertyDescs = {};

		// process polymorphic container
		this._isPolymorphObject = false;
		this._isPolymorphRef = false;
		if (containerDef.subtypes) {
			if ((nestedPath.length === 0) ||
				containerDef.valueType.startsWith('object')) {
				this._isPolymorphObject = true;
				this._subtypes = new Array();
				this._typePropertyName = containerDef.typePropertyName;
			} else if (containerDef.valueType &&
				containerDef.valueType.startsWith('ref')) {
				if (containerDef.properties)
					throw new common.X2UsageError(
						'Polymoprhic reference property ' + nestedPath +
							' of record type ' + recordTypeName +
							' may not have "properties" definition attribute.');
				this._isPolymorphRef = true;
				this._subtypes = new Array();
			}
		}

		// new record factory method
		this.newRecord = (
			containerDef.factory ?
				containerDef.factory : function() { return new Object(); });
	}

	/**
	 * Add properties from the definition to the container.
	 *
	 * @protected
	 * @param {module:x2node-records~LibraryConstructionContext} ctx Library
	 * construction context.
	 * @returns {module:x2node-records~PropertiesContainer} This container.
	 */
	addProperties(ctx) {

		// get the property definitions
		const propertyDefs = (this._definition.properties || {});

		// collect all property names
		for (let propName in propertyDefs)
			this._propNames.push(propName);

		// add non-view properties and find all the views
		const views = new Array();
		for (let propName of this._propNames) {
			const propDef = propertyDefs[propName];
			if (propDef.viewOf !== undefined)
				views.push(propName);
			else
				this._addProperty(ctx, propName, propDef);
		}

		// add view properties
		for (let propName of views) {
			const propDef = propertyDefs[propName];
			const viewOfDesc = this._propertyDescs[propDef.viewOf];
			if (!viewOfDesc)
				throw new common.X2UsageError(
					'Property ' + this._nestedPath + propName +
						' of record type ' + String(this._recordTypeName) +
						' is a view of a non-existent property ' +
						this._nestedPath + propDef.viewOf + '.');
			if (viewOfDesc._viewOfDesc)
				throw new common.X2UsageError(
					'Property ' + this._nestedPath + propName +
						' of record type ' + String(this._recordTypeName) +
						' is a view of another view.');
			const viewPropDef = Object.create(viewOfDesc._definition);
			for (let p in propDef) {
				if ((p === 'properties') || (p === 'subtypes'))
					throw new common.X2UsageError(
						'Property ' + this._nestedPath + propName +
							' of record type ' + String(this._recordTypeName) +
							' is a view and may not override the nested' +
							' object properties or subtypes.');
				viewPropDef[p] = propDef[p];
			}
			this._addProperty(ctx, propName, viewPropDef, viewOfDesc);
		}

		// add subtype pseudo-properties
		if (this._isPolymorphObject) {
			for (let subtypeName in this._definition.subtypes) {

				if (this._propertyDescs[subtypeName])
					throw new common.X2UsageError(
						'Subtype ' + subtypeName + ' of ' + (
								this._nestedPath.length > 0 ?
									'polymorphic nested object property ' +
										this._nestedPath + ' of record type ' :
									'polymorphic record type '
							) + String(this._recordTypeName) +
							' shares name with one of the super-type' +
							' properties.');

				this._propNames.push(subtypeName);
				this._subtypes.push(subtypeName);

				const subtypePropDef = Object.create(
					this._definition.subtypes[subtypeName]);
				subtypePropDef[SUBTYPE] = true;
				subtypePropDef.valueType = 'object';
				subtypePropDef.optional = true;

				this._addProperty(ctx, subtypeName, subtypePropDef);
			}

		} else if (this._isPolymorphRef) {
			for (let refTarget of this._definition.subtypes) {

				this._propNames.push(refTarget);
				this._subtypes.push(refTarget);

				this._addProperty(ctx, refTarget, {
					[SUBTYPE]: true,
					valueType: 'ref(' + refTarget + ')',
					optional: true
				});
			}
		}

		// return the container
		return this;
	}

	/**
	 * Add property to the container.
	 *
	 * @private
	 * @param {module:x2node-records~LibraryConstructionContext} ctx Library
	 * construction context.
	 * @param {string} propName Property name.
	 * @param {Object} propDef Property definition.
	 * @param {module:x2node-records~PropertyDescriptor} [viewOfDesc] For a view
	 * property, descriptor of the base property.
	 */
	_addProperty(ctx, propName, propDef, viewOfDesc) {

		this._propertyDescs[propName] = ctx.extendProperty(
			new PropertyDescriptor(ctx, this, propName, propDef, viewOfDesc)
		);
	}

	/**
	 * Get specified property descriptor.
	 *
	 * @param {string} propName Property name.
	 * @returns {module:x2node-records~PropertyDescriptor} The property
	 * descriptor.
	 * @throws {module:x2node-common.X2UsageError} If no such property in the
	 * container.
	 */
	getPropertyDesc(propName) {

		const propDesc = this._propertyDescs[propName];
		if (!propDesc)
			throw new common.X2UsageError(
				'Record type ' + String(this._recordTypeName) +
					' does not have property ' + this._nestedPath + propName +
					'.');

		return propDesc;
	}

	/**
	 * Tell if the container contains the specified property.
	 *
	 * @param {string} propName Property name.
	 * @returns {boolean} <code>true</code> if there is such property.
	 */
	hasProperty(propName) {

		return this._propertyDescs.hasOwnProperty(propName);
	}

	/**
	 * Tell if this container is a record type descriptor.
	 *
	 * @returns {boolean} <code>true</code> if record type descriptor.
	 */
	isRecordType() {

		return (this._nestedPath.length === 0);
	}

	/**
	 * Name of the record type, to which the container belongs (name of the
	 * record type itself if the container <em>is</em> a record type).
	 *
	 * @member {(string|Symbol)}
	 * @readonly
	 */
	get recordTypeName() { return this._recordTypeName; }

	/**
	 * Dot-separated path to the property represented by the container within the
	 * record type ending with a dot, or empty string if the container is a
	 * record type. Path to a property of a polymoprhic nested object includes
	 * the subtype name as a path element.
	 *
	 * @member {string}
	 * @readonly
	 */
	get nestedPath() { return this._nestedPath; }

	/**
	 * Tell if polymorphic object container. A polymorphic object container will
	 * have <code>subtypes</code> and <code>typePropertyName</code> descriptor
	 * properties. Plus some of the property descriptors in the container will
	 * have their <code>isSubtype()</code> method return <code>true</code>.
	 *
	 * @returns {boolean} <code>true</code> if polymorphic object container.
	 */
	isPolymorphObject() { return this._isPolymorphObject; }

	/**
	 * Tell if polymorphic reference container. A polymorphic reference container
	 * will have <code>subtypes</code> descriptor property. Plus all of the
	 * property descriptors in the container will have their
	 * <code>isSubtype()</code> method return <code>true</code>.
	 *
	 * @returns {boolean} <code>true</code> if polymorphic reference container.
	 */
	isPolymorphRef() { return this._isPolymorphRef; }

	/**
	 * Tell if polymorphic object or reference container.
	 *
	 * @returns {boolean} <code>true</code> if polymorphic container.
	 */
	isPolymorph() { return (this._isPolymorphObject || this._isPolymorphRef); }

	/**
	 * For a polymoprhic object container, name of the property used in the
	 * record instances described by the container to indicate the record
	 * instance subtype. Note, that the property does not have a descriptor in
	 * the container and is not listed in the <code>allPropertyNames</code>.
	 *
	 * @member {string=}
	 * @readonly
	 */
	get typePropertyName() { return this._typePropertyName; }

	/**
	 * For a polymorphic object container, the list of all subtype names. For a
	 * polymoprhic reference container, the list of names of all allowed referred
	 * record types.
	 *
	 * @member {Array.<string>=}
	 * @readonly
	 */
	get subtypes() { return this._subtypes; }

	/**
	 * Name of the id property in the container, or <code>undefined</code> if no
	 * id property.
	 *
	 * @member {string=}
	 * @readonly
	 */
	get idPropertyName() { return this._idPropName; }

	/**
	 * Names of all properties in the container.
	 *
	 * @member {Array.<string>}
	 * @readonly
	 */
	get allPropertyNames() { return this._propNames; }

	/**
	 * Container definition (nested object or record type).
	 *
	 * @member {Object}
	 * @readonly
	 */
	get definition() { return this._definition; }

	/**
	 * Parent container for a nested object property or <code>null</code> for a
	 * record type.
	 *
	 * @member {?module:x2node-records~PropertiesContainer}
	 * @readonly
	 */
	get parentContainer() { return this._parentContainer; }

	/**
	 * Create new, empty record instance for this container.
	 *
	 * @function module:x2node-records~PropertiesContainer#newRecord
	 * @returns {Object} New record instance.
	 */
}


/**
 * Regular expression for parsing property value type specifications.
 *
 * @private
 * @constant {RegExp}
 */
const VALUE_TYPE_RE = new RegExp(
	'^(?:(string|number|boolean|datetime|object)' +
		'|(ref)\\((\\S+)\\))(?:\\[\\]|\\{\\})?$'
);

/**
 * Record property descriptor.
 *
 * @memberof module:x2node-records
 * @inner
 */
class PropertyDescriptor {

	/**
	 * <strong>Note:</strong> The constructor is not accessible from the client
	 * code. Property descriptors are created internally and are available via
	 * the property container's
	 * [getPropertyDesc()]{@link module:x2node-records~PropertiesContainer#getPropertyDesc}
	 * method.
	 *
	 * @private
	 * @param {module:x2node-records~LibraryConstructionContext} ctx Library
	 * construction context.
	 * @param {module:x2node-records~PropertiesContainer} container The
	 * container, to which the property belongs.
	 * @param {string} propName Property name.
	 * @param {Object} propDef Property definition.
	 * @param {module:x2node-records~PropertyDescriptor} [viewOfDesc] For a view
	 * property, descriptor of the base property.
	 */
	constructor(ctx, container, propName, propDef, viewOfDesc) {

		// save the basics
		this._name = propName;
		this._container = container;
		this._definition = propDef;
		this._viewOfDesc = viewOfDesc;

		// build up the container chain
		this._containerChain = new Array();
		for (let c = container; c; c = c.parentContainer)
			this._containerChain.unshift(c);

		// determine if subtype pseudo-property
		this._subtype = (propDef[SUBTYPE] ? true : false);

		// parse the value type
		const match = VALUE_TYPE_RE.exec(propDef.valueType);
		if (match === null)
			throw new common.X2UsageError(
				'Property ' + container.nestedPath + propName +
					' of record type ' + String(container.recordTypeName) +
					' has missing or invalid valueType attribute.');
		this._scalarValueType = match.find((val, ind) => ((ind > 0) && val));
		if (this._scalarValueType === 'ref')
			this._refTarget = match[3];

		// determine whether scalar, array or map
		this._isArray = propDef.valueType.endsWith('[]');
		this._isMap = propDef.valueType.endsWith('{}');
		this._isScalar = (!this._isArray && !this._isMap);

		// determine if id property
		this._isId = (propDef.role === 'id');

		// determine optionality
		this._optional = (
			propDef.optional === undefined ?
				!this._isScalar : propDef.optional);

		// determine modifiability
		if (!viewOfDesc && (propDef.modifiable !== undefined))
			this._modifiable = (propDef.modifiable ? true : false);
		else
			this._modifiable = (!this._isId && !viewOfDesc);
	}

	/**
	 * Property name.
	 *
	 * @member {string}
	 * @readonly
	 */
	get name() { return this._name; }

	/**
	 * Container, to which the property belongs.
	 *
	 * @member {module:x2node-records~PropertiesContainer}
	 * @readonly
	 */
	get container() { return this._container; }

	/**
	 * Container chain. The first element in the chain is the record type
	 * descriptor, the last element is the property container (same one as in
	 * <code>container</code> descriptor property).
	 *
	 * @member {Array.<module:x2node-records~PropertiesContainer>}
	 * @readonly
	 */
	get containerChain() { return this._containerChain; }

	/**
	 * Property definition.
	 *
	 * @member {Object}
	 * @readonly
	 */
	get definition() { return this._definition; }

	/**
	 * Tell if the property is a view of another property.
	 *
	 * @returns {boolean} <code>true</code> if the property is a view.
	 */
	isView() { return (this._viewOfDesc !== undefined); }

	/**
	 * For a view property, descriptor of the base property.
	 *
	 * @member {module:x2node-records~PropertyDescriptor=}
	 * @readonly
	 */
	get viewOfDesc() { return this._viewOfDesc; }

	/**
	 * Tell if the property is a pseudo-property representing its polymorphic
	 * container's subtype-specific properties. Every polymoprhic container
	 * (container descriptor's <code>isPolymorph()</code> method returns
	 * <code>true</code>) has one such pseudo-property for each subtype. For a
	 * polymorphic object container, the property name is the subtype name, the
	 * type is an optional scalar "object", and the nested properties are the
	 * subtype-specific properties. For a polymoprhic reference container, the
	 * property name is one of the referred record type names and the type is
	 * "ref".
	 *
	 * @returns {boolean} <code>true</code> if a subtype pseudo-property.
	 */
	isSubtype() { return this._subtype; }

	/**
	 * Scalar value type of the property. One of "string", "number", "boolean",
	 * "datetime", "object" or "ref".
	 *
	 * @member {string}
	 * @readonly
	 */
	get scalarValueType() { return this._scalarValueType; }

	/**
	 * Tell if the property is scalar.
	 *
	 * @returns {boolean} <code>true</code> if the property is scalar.
	 */
	isScalar() { return this._isScalar; }

	/**
	 * Tell if the property is an array.
	 *
	 * @returns {boolean} <code>true</code> if the property is an array.
	 */
	isArray() { return this._isArray; }

	/**
	 * Tell if the property is a map.
	 *
	 * @returns {boolean} <code>true</code> if the property is a map.
	 */
	isMap() { return this._isMap; }

	/**
	 * Tell if the property is a non-polymorphic reference
	 * (<code>scalarValueType</code> is "ref"). Note, that this does not
	 * include polymorphic reference properties whose
	 * <code>scalarValueType</code> is "object".
	 *
	 * @returns {boolean} <code>true</code> if the property is a non-polymorphic
	 * reference.
	 */
	isRef() { return (this._scalarValueType === 'ref'); }

	/**
	 * Name of the target record type for a non-polymorphic reference property
	 * (<code>isRef()</code> returns <code>true</code>).
	 *
	 * @member {string=}
	 * @readonly
	 */
	get refTarget() { return this._refTarget; }

	/**
	 * Tell if the property is a record (including nested object) id.
	 *
	 * @returns {boolean} <code>true</code> if the property is an id.
	 */
	isId() { return this._isId; }

	/**
	 * <code>true</code> if the property is optional.
	 *
	 * @member {boolean}
	 * @readonly
	 */
	get optional() { return this._optional; }

	/**
	 * <code>true</code> if the property is modifiable. Note, that being not
	 * modifiable does not necessarily mean immutable. It merely means that
	 * setting a new value directly to the property is disallowed.
	 *
	 * @member {boolean}
	 * @readonly
	 */
	get modifiable() { return this._modifiable; }
}

// export the properties container class
module.exports = PropertiesContainer;
