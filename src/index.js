'use strict';

const { nanoid } = require('nanoid');
const Parser = require('easy-oas3-parser').default;

const types_created = {};

/**
 *
 * @param {import('stream').Writable} output
 * @param {string} name
 * @param {string} schema
 */
function createType(output, name, schema) {
	output.write(`${schema}\n\n`);
	types_created[name] = schema;
}

/**
 *
 * @param {import('easy-oas3-parser').BaseNode} parsed_schema
 * @returns {string}
 */
function parsedSchemaToGraphql(parsed_schema, base_name, output) {
	if (parsed_schema.isArray()) {
		const type = parsedSchemaToGraphql(parsed_schema.items, base_name, output);
		return `[${type}]`;
	}
	if (parsed_schema.isBoolean()) {
		return 'Boolean';
	}
	if (parsed_schema.isNumber()) {
		return 'Float';
	}
	if (parsed_schema.isString()) {
		// - is not allowed in graphql enum
		return 'String';
	}
	if (parsed_schema.isObject()) {
		const schema = `type ${base_name} {\n${_.map(
			_.toPairs(parsed_schema.properties),
			([k, v]) => {
				const is_required = _.get(parsed_schema, 'required', []).includes(k);

				return `\t${k}: ${parsedSchemaToGraphql(v, `${base_name}__${k}`, output)}${is_required ? '!' : ''}`
			}
		).join('\n')}\n}`;

		// Generate a new type
		createType(output, base_name, schema);

		return base_name;
	}
	if (parsed_schema.isOneOf()) {
		// TODO: Handle oneof Type | Null;

		const union = parsed_schema.cases
			.map(schema => {
				return parsedSchemaToGraphql(schema, `${base_name}__${schema.isObject() && schema.title || nanoid(5)}`, output);
			})
			.join(' | ');

		createType(output, base_name, `union ${base_name} = ${union}`);

		return base_name;
	}
	if (parsed_schema.isAnyOf()) {
		throw new Error('AnyOf is not supported yet');
	}
	if (parsed_schema.isNull()) {
		// TBC
		return 'Null';
	}
	// TBC
	return '';
}

/**
 *
 * @param {import('stream').Writable} output
 * @param {object} component
 */
function convertComponent(output, component) {
	const type = parsedSchemaToGraphql(Parser(component), component.title || nanoid(5), output);
	return type;
}

module.exports = {
	convertComponent,
}