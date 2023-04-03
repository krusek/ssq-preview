
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
        html += '<p class="' + paragraph.type + '">' + p + '</p>'
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