import { error } from "console"

function process_children(items: Array<any>): string {
    var html: string = ""
    for (var index in items) {
        var paragraph = items[index]
        var p: string = paragraph['text']
        var references: Array<any> = paragraph['references'] || []
        references.sort((a: any, b: any) => a.start > b.start ? -1 : 1)
        p = process_references(p, references)
        p = do_lead(p, paragraph.lead)
        html += '<div class="' + paragraph.type + '">' + p + '</div>';
        var errors: Array<string> = validate_references(references);
        errors.push(...validate_paragraph(paragraph));
        if (errors.length > 0) {
            html += '<ul class="error">';
            for (var i = 0; i < errors.length; i++) {
                html += `<li>${errors[i]}`;
            }
            html += '</ul>';
        }
        var children: Array<any> = paragraph['children'] ?? []
        html = html + process_children(children)
    }
    return html;
}

export function convertJson(json: any): string {
    var doc = json['doc']

    var html = '<h1>' + json['header'] + '</h1>'
    html += '<h2>' + json['title'] + '</h2>'
    html += process_children(json['doc'])
    return html
}

function insert_tag(text: string, open: string, close: string, start: number, end: number): string {
    return text.substring(0, start) + open + text.substring(start, end) + close + text.substring(end)
}

function do_lead(text: string, lead: number): string {
    if (lead) return insert_tag(text, '<b>', '</b>', 0, lead)
    return text
}

function validate_paragraph(paragraph: any): Array<string> {
    var errors: Array<string> = []
    const lead: number = paragraph['lead'] ?? 0
    if (typeof lead === "string") {
        errors.push('"lead" is a string. It should be a number.')
    }
    const text: string = paragraph['text']
    const length = text.length
    if (lead > text.length) {
        const error = `"lead" value too large. Should be no more than ${length}.`
        errors.push(error)
    }
    return errors;
}

function process_references(text: string, references: Array<any>): string {
    for (var index2 in references) {
        var reference = references[index2]
        var link = link_text(reference)
        text = insert_tag(text, '<a href="#">', '</a>[' + link + ']', reference.start, reference.end)
    }
    return text
}

function check_type(dict: any, key: string, type: string, message_prefix: string, allow_null: boolean = false): Array<string> {
    if (allow_null && dict[key] === undefined) {
        return []
    }
    if (typeof dict[key] !== type) {
        return [`${message_prefix} ${key} should be a ${type}. ${dict[key]}`]
    }
    return []
}

function validate_references(references: Array<any>): Array<string> {
    var errors: Array<string> = []
    for (var i = 0; i < references.length; i++) {
        const reference = references[i];
        if (!reference.book) {
            const error = `Bible link number ${i} has an error. Unknown bible book: ${reference.book}`;
            errors.push(error);
        }
        if (!reference.c) {
            const error = `Bible link number ${i} has an error. Unknown chapter: ${reference.c}`;
            errors.push(error);
        }
        errors.push(...check_type(reference, 'c', 'string', `Bible link number ${i} has an error.`));
        errors.push(...check_type(reference, 'v1', 'string', `Bible link number ${i} has an error.`));
        errors.push(...check_type(reference, 'v2', 'string', `Bible link number ${i} has an error.`, true));
        errors.push(...check_type(reference, 'start', 'number', `Bible link number ${i} has an error.`));
        errors.push(...check_type(reference, 'end', 'number', `Bible link number ${i} has an error.`));
        const link = link_text(reference);
        var gateway = reference.link
        if (!gateway || (!gateway.includes(link) && !gateway.includes(link.replace(' ', '')))) {
            const error = `Bible link number ${i} has error. Bible reference: ${link} Gateway link: ${gateway}`;
            errors.push(error);
        }
        for (var j = i + 1; j < references.length; j++) {
            const reference2 = references[j];
            if ((reference.start < reference2.start && reference.end > reference2.start)
                || (reference2.start < reference.start && reference2.end > reference.start)) {
                const error = `Bible links numbered ${i} and ${j} overlap.`;
                errors.push(error);
            }
        }
    }
    return errors
}

function link_text(reference: any): string {
    var link = reference.book
    if (reference.c)
        link += " " + reference.c
    if (reference.v1)
        link += ":" + reference.v1
    if (reference.v2)
        link += "-" + reference.v2
    return link
}