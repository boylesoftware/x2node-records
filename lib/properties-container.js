'use strict';

const common = require('x2node-common');


/**
 * Descriptor of an entity that has properties, such as record type or a nested
 * object property.
 *
 * @memberof module:x2node-records
 * @inner
 */
class PropertiesContainer {

	/**
	 * <b>The constructor is not accessible from the client code. Container
	 * instances are created internally and are made available via other
	 * descriptor objects.</b>
	 *
	 * @param {(string|Symbol)} recordTypeName Name of the record type, to which
	 * the container belongs (name of the record type if the container
	 * <em>is</em> itself the record type).
	 * @param {string} nestedPath Dot-separated path to the property represented
	 * by the container, or empty string if the container is the record type
	 * descriptor.
	 * @param {Object} containerDef Container definition.
	 */
	constructor(recordTypeName, nestedPath, containerDef) {

		this._recordTypeName = recordTypeName;
		this._nestedPath = nestedPath;
		this._definition = containerDef;

		this._propNames = new Array();
		this._propertyDescs = {};
	}

	/**
	 * Add properties from the definition to the container.
	 *
	 * @private
	 * @param {module:x2node-records~RecordTypesLibraryFactoryContext} ctx
	 * Library construction context.
	 * @returns {module:x2node-records~PropertiesContainer} This container.
	 */
	addProperties(ctx) {

		// get the property definitions
		const propertyDefs = (this._definition.properties || {});

		// get all property names and determine the record id property
		for (let propName in propertyDefs)
			this._propNames.push(propName);

		// add non-view properties and find all the views
		const views = new Array();
		this._propNames.forEach(propName => {
			const propDef = propertyDefs[propName];
			const viewOf = propDef.viewOf;
			if (viewOf !== undefined)
				views.push(propName);
			else
				this._addProperty(ctx, propName, propDef);
		});

		// add view properties
		views.forEach(propName => {
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
		});

		// return the container
		return this;
	}

	/**
	 * Add property to the container.
	 *
	 * @private
	 * @param {module:x2node-records~RecordTypesLibraryFactoryContext} ctx
	 * Library construction context.
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

		return (this._propertyDescs[propName] !== undefined);
	}

	/**
	 * Name of the record type, to which the container belongs (name of the
	 * record type itself if the container <em>is</em> a record type).
	 *
	 * @type {(string|Symbol)}
	 * @readonly
	 */
	get recordTypeName() { return this._recordTypeName; }

	/**
	 * Dot-separated path to the property represented by the container within the
	 * record type, or empty string if the container is a record type. Path to
	 * a property of a polymoprhic nested object includes the subtype name as a
	 * path element.
	 *
	 * @type {string}
	 * @readonly
	 */
	get nestedPath() { return this._nestedPath; }

	/**
	 * Name of the id property in the container, or <code>undefined</code> if no
	 * id property.
	 *
	 * @type {string}
	 * @readonly
	 */
	get idPropertyName() { return this._idPropName; }

	/**
	 * Names of all properties in the container.
	 *
	 * @type {string[]}
	 * @readonly
	 */
	get allPropertyNames() { return this._propNames; }

	/**
	 * Container definition (nested object or record type).
	 *
	 * @type {Object}
	 * @readonly
	 */
	get definition() { return this._definition; }
}

/**
 * Record property descriptor.
 *
 * @memberof module:x2node-records
 * @inner
 */
class PropertyDescriptor {

	/**
	 * <b>The constructor is not accessible from the client code. Property
	 * descriptors are created internally and are available via the property
	 * container's
	 * [getPropertyDesc]{@link module:x2node-records~PropertiesContainer#getPropertyDesc}
	 * method.</b>
	 *
	 * @param {module:x2node-records~RecordTypesLibraryFactoryContext} ctx
	 * Library construction context.
	 * @param {module:x2node-records~PropertiesContainer} container The
	 * container, to which the property belongs.
	 * @param {string} propName Property name.
	 * @param {Object} propDef Property definition.
	 * @param {module:x2node-records~PropertyDescriptor} [viewOfDesc] For a view
	 * property, descriptor of the base property.
	 */
	constructor(ctx, container, propName, propDef, viewOfDesc) {

		this._name = propName;
		this._container = container;
		this._definition = propDef;
		this._viewOfDesc = viewOfDesc;
	}

	/**
	 * Property name.
	 *
	 * @type {string}
	 * @readonly
	 */
	get name() { return this._name; }

	/**
	 * Container, to which the property belongs.
	 *
	 * @type {module:x2node-records~PropertiesContainer}
	 * @readonly
	 */
	get container() { return this._container; }

	/**
	 * Property definition.
	 *
	 * @type {Object}
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
	 * @type {module:x2node-records~PropertyDescriptor}
	 * @readonly
	 */
	get viewOfDesc() { return this._viewOfDesc; }
}

// export the properties container class
module.exports = PropertiesContainer;
