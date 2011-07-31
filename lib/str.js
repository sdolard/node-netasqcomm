/**
* @return right and left trimmed string
* @param {string} string to trim
*/
var 
	RE_STR_TRIM = /^\s+|\s+$/g,
	RE_XML_TRIM_RIGHT = />\s/g;

function strTrim(str) {
	if (str === undefined) {
		return '';
	}
	return String(str).replace(RE_STR_TRIM, '');
}

function xmlTrimRight(str) {
	if (str === undefined) {
		return '';
	}
	return String(str).replace(RE_XML_TRIM_RIGHT, '>');
}

/*******************************************************************************
* Exports
*******************************************************************************/
exports.trim = strTrim;
exports.xmlTrimRight = xmlTrimRight;
