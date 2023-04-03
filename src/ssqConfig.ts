import { error } from "console"

export function convertJson(json: any): String {
    var doc = json['doc']

    var html = '<h1>' + json['header'] + '</h1>'
    html += '<h2>' + json['title'] + '</h2>'
    for (var index in doc) {
        var paragraph = doc[index]
        var p = paragraph['text']
        var references = paragraph['references'] || []
        references.sort((a, b) => a.start > b.start ? -1 : 1)
        p = process_references(p, references)
        p = do_lead(p, paragraph.lead)
        html += '<div class="' + paragraph.type + '">' + p + '</div>';
        const errors = validate_references(references);
        if (errors.length > 0) {
            html += '<ul class="error">';
            for (var i = 0; i < errors.length; i++) {
                html += `<li>${errors[i]}`;
            }
            html += '</ul>';
        }
    }
    return html
}

function insert_tag(text: String, open: String, close: String, start, end): String {
    return text.substring(0, start) + open + text.substring(start, end) + close + text.substring(end)
}

function do_lead(text: String, lead): String {
    if (lead) return insert_tag(text, '<b>', '</b>', 0, lead)
    return text
}

function validate_references(references: Array<any>): Array<String> {
    var errors: Array<String> = []
    for (var i = 0; i < references.length; i++) {
        const reference = references[i];
        if (!reference.book) {
            const error = `Bible link number ${i} has error. Unknown bible book: ${reference.book}`;
            errors.push(error);
        }
        if (!reference.c) {
            const error = `Bible link number ${i} has error. Unknown chapter: ${reference.c}`;
            errors.push(error);
        }
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

function process_references(text, references): String {
    for (var index2 in references) {
        var reference = references[index2]
        var link = link_text(reference)
        text = insert_tag(text, '<a href="#">', '</a>[' + link + ']', reference.start, reference.end)
    }
    return text
}

function link_text(reference): String {
    var link = reference.book
    if (reference.c)
        link += " " + reference.c
    if (reference.v1)
        link += ":" + reference.v1
    if (reference.v2)
        link += "-" + reference.v2
    return link
}