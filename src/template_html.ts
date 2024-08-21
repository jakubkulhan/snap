import {Template, TemplateValues, Values} from "./template.ts";
import {Compiler} from "./template_compiler.ts";

const templateCache = new Map<TemplateStringsArray | string, Template>();

export function html(strings: TemplateStringsArray, ...values: Values): TemplateValues {
    if (!templateCache.has(strings)) {
        const hash = computeHash(strings);
        if (!templateCache.has(hash)) {
            const compiler = new Compiler(strings);
            compiler.compile();
            const template = new Template(hash, compiler.template.content, compiler.fragmentValues, compiler.attributeValues, compiler.eventListenerValues);
            templateCache.set(hash, template);
        }
        templateCache.set(strings, templateCache.get(hash));
    }
    return new TemplateValues(templateCache.get(strings), values);
}

/**
 * Based on https://github.com/darkskyapp/string-hash/blob/master/index.js
 */
function computeHash(strings: TemplateStringsArray): string {
    let hash = 5381;
    for (let i = 0; i < strings.length; i++) {
        hash = (hash * 33) ^ i;
        const s = strings[i];
        for (let j = 0; j < s.length; j++) {
            hash = (hash * 33) ^ s.charCodeAt(j);
        }
    }
    hash = hash >>> 0;
    return hash.toString(36);
}
