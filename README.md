# X2 Framework for Node.js | Record Types Library

X2 Framework deals with the notion of *records*. Records are objects of a certain type, usually persisted in a database and identified by a unique id. In the code, records are represented by JSON objects. The collection of *record types* assembled into a *record types library* define the data domain, with which the application works. Record types define the structure of the records, record properties and their types, etc. A record type definition is a schema for the records, or, using the OOP concept, record types are like classes and records are like instances of objects of those classes.

This module provides the essentials for the application record types library. The library is represented by an instance of `RecordTypesLibrary` class exported by the module. A single library instance is usually created by the application once and then used throughout the runtime. When the library is created, it is provided with a JSON object that contains the *record type definitions*. For example:

```javascript
const RecordTypesLibrary = require('x2node-records');

const recordTypes = new RecordTypesLibrary({
	'Account': {
		properties: {
			'id': {
				valueType: 'number',
				role: 'id'
			},
			'name': {
				valueType: 'string'
			},
			'orderRefs: {
				valueType: '[ref(Order)]'
			}
		}
	},
	'Product': {
		properties: {
			'id': {
				valueType: 'number',
				role: 'id'
			},
			'name': {
				valueType: 'string'
			}
		}
	},
	'Order': {
		properties: {
			'id': {
				valueType: 'number',
				role: 'id'
			},
			'accountRef': {
				valueType: 'ref(Account)'
			},
			'items': {
				valueType: '[object]',
				properties: {
					'id': {
						valueType: 'number',
						role: 'id'
					},
					'productRef': {
						valueType: 'ref(Product)'
					},
					'quantity': {
						valueType: 'number'
					}
				}
			}
		}
	}
});
```

The example above defines three record types: "Account", "Product" and "Order". Detailed description of the record type definitions follows.

## Record Type Definitions

TODO

## The Descriptors

TODO

## Extensibility

TODO
