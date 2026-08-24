var t={documentTemplate:{importId:"standard-article",title:"Standard Article",content:{type:"doc",attrs:{template:"Standard Article",import_id:"standard-article"},content:[{type:"title"},{type:"heading_part",attrs:{title:"Subtitle",id:"subtitle",optional:"hidden",hidden:!0,initial:[{type:"heading1",attrs:{id:"H6323428"}}],marks:["strong","em","underline","sup","sub","link","code"],metadata:"subtitle"},content:[{type:"heading1",attrs:{id:"H6323428"}}]},{type:"contributors_part",attrs:{title:"Authors",id:"authors",optional:"hidden",hidden:!0,item_title:"Author",metadata:"authors"}},{type:"richtext_part",attrs:{title:"Abstract",id:"abstract",optional:"hidden",hidden:!0,marks:["strong","em","underline","sup","sub","link","code"],metadata:"abstract"},content:[{type:"paragraph"}]},{type:"tags_part",attrs:{title:"Keywords",id:"keywords",optional:"hidden",hidden:!0,item_title:"Keyword",metadata:"keywords"}},{type:"richtext_part",attrs:{title:"Body",id:"body",marks:["strong","em","underline","sup","sub","link","code"]},content:[{type:"paragraph"}]}]}},documentStyles:[{title:"Comfy Elephant",slug:"elephant",contents:`@font-face {font-family: 'Source Sans Pro';\r
font-style: normal;\r
font-weight: 700;\r
src: local('Source Sans Pro Bold'), local('SourceSansPro-Bold'), url(SourceSansPro-Bold.woff) format('woff');}

@font-face {font-family: 'Noticia Text';\r
font-style: italic;\r
font-weight: 700;\r
src: local('Noticia Text Bold Italic'), local('NoticiaText-BoldItalic'), url(NoticiaText-BoldItalic.woff) format('woff');}

@font-face {font-family: 'Noticia Text';\r
font-style: italic;\r
font-weight: 400;\r
src: local('Noticia Text Italic'), local('NoticiaText-Italic'), url(NoticiaText-Italic.woff) format('woff');}

@font-face {font-family: 'Noticia Text';\r
font-style: normal;\r
font-weight: 400;\r
src: local('Noticia Text'), local('NoticiaText-Regular'), url(NoticiaText-Regular.woff) format('woff');}

@font-face {font-family: 'Noticia Text';\r
font-style: normal;\r
font-weight: 700;\r
src: local('Noticia Text Bold'), local('NoticiaText-Bold'), url(NoticiaText-Bold_2.woff) format('woff');}
@font-face {font-family: 'JetBrains Mono';
font-style: normal;
font-weight: 400;
src: local('JetBrains Mono'), local('JetBrainsMono-Regular'), url(JetBrainsMono-Regular.woff) format('woff');}
@font-face {font-family: 'JetBrains Mono';
font-style: normal;
font-weight: 700;
src: local('JetBrains Mono Bold'), local('JetBrainsMono-Bold'), url(JetBrainsMono-Bold.woff) format('woff');}@font-face {font-family: 'Source Sans Pro';\r
font-style: normal;\r
font-weight: 400;\r
src: local('Source Sans Pro'), local('SourceSansPro-Regular'), url(SourceSansPro-Regular.woff) format('woff');}

.user-contents {\r
    font-family: 'Noticia Text', serif;\r
    font-weight: 400;\r
    font-size: 1.2em;\r
    /*text-align: justify;*/\r
    word-wrap: break-word;\r
}\r
\r
.doc-authors, .doc-keywords {\r
    line-height: 1.6em;\r
}\r
\r
.doc-title {\r
    font-family: 'Source Sans Pro', sans-serif;\r
    font-size: 48px;\r
    font-weight: 700;\r
}\r
\r
.doc-subtitle {\r
    font-family: 'Source Sans Pro', sans-serif;\r
    font-size: 40px;\r
    font-weight: 900;\r
}\r
\r
.doc-abstract {\r
    margin-left: 50px;\r
    margin-right: 50px;\r
}\r
\r
.doc-part.metadata {\r
    margin-bottom: 20px;\r
}\r
\r
.pagination-footnote:before,\r
.pagination-footnote > * > *:first-child:before {\r
    font-family: 'Noticia Text', serif;\r
    font-weight: 400;\r
    font-size: 9px;\r
    text-align: left;\r
    vertical-align: super;\r
    line-height: 0;\r
}\r
\r
.pagination-footnote > * > *:first-child:before {\r
    margin-right: 5px;\r
}\r
\r
.pagination-footnote > * > * {\r
    font-family: 'Noticia Text', serif;\r
    font-weight: 400;\r
    font-size: 10px;\r
}\r
\r
.pagination-pagenumber {\r
    font-family: 'Source Sans Pro', sans-serif;\r
    font-size: 12px;\r
    font-weight: 700;\r
}\r
\r
.pagination-footnotes {\r
    margin-top: 25px;\r
}\r
\r
.user-contents h1,\r
.user-contents h2,\r
.user-contents h3,\r
.user-contents h4,\r
.user-contents h5,\r
.user-contents h6,\r
.user-contents p,\r
.user-contents blockquote,\r
.user-contents code,\r
.user-contents ol,\r
.user-contents ul {\r
    margin-bottom: 35px;\r
}\r
\r
.user-contents h1,\r
.user-contents h2,\r
.user-contents h3,\r
.user-contents h4,\r
.user-contents h5,\r
.user-contents h6 {\r
    font-family: 'Source Sans Pro', sans-serif;\r
    font-weight: 700;\r
    line-height: 1.25em;\r
}\r
\r
.user-contents h1  {\r
    font-size: 36px;\r
}\r
\r
.user-contents h2 {\r
    font-size: 32px;\r
}\r
\r
.user-contents h3 {\r
    font-size: 28px;\r
}\r
\r
.user-contents h4 {\r
    font-size: 26px;\r
    font-style: italic;\r
}\r
\r
.user-contents h5 {\r
    font-size: 24px;\r
    font-variant: small-caps;\r
}\r
\r
\r
.user-contents h6 {\r
    font-size: 22px;\r
    text-decoration: underline;\r
}\r
\r
\r
.user-contents p,\r
.user-contents ol li,\r
.user-contents ul li {\r
    font-size: 16px;\r
    line-height: 1.75em;\r
}\r
\r
.user-contents strong {\r
    font-weight: 700;\r
}\r
\r
.user-contents em {\r
    font-style: italic;\r
}\r
\r
.user-contents ul,\r
.user-contents ol {\r
    padding-left: 15px;\r
}\r
.user-contents ul {\r
    list-style: square;\r
}\r
\r
.user-contents ol {\r
    list-style: decimal;\r
}\r
\r
.user-contents blockquote {\r
    margin-left: 40px;\r
    margin-right: 40px;\r
    font-size: 13px;\r
    line-height: 1.8em;\r
}\r
\r
.user-contents code {\r
    display: block;\r
    font-family: "JetBrains Mono", "DejaVu Sans Mono", monospace;\r
    font-size: 13px;\r
    line-height: 1.75em;\r
}\r
\r
.doc-bibliography p {\r
    font-size: 14px;\r
    margin-bottom: 18px;\r
}\r
\r
.equation {\r
    font-size: 80%;\r
}\r
@page {@bottom-center {font-family: 'Source Sans Pro', sans-serif; font-weight: 700;}}`,files:["NoticiaText-Bold_2.woff","NoticiaText-Regular.woff","NoticiaText-Italic.woff","NoticiaText-BoldItalic.woff","SourceSansPro-Bold.woff","JetBrainsMono-Regular.woff","JetBrainsMono-Bold.woff","SourceSansPro-Regular.woff"]},{title:"Foxy Fox",slug:"fox",contents:`@font-face {font-family: 'Lobster 1.4';\r
font-style: normal;\r
font-weight: 400;\r
src: local('Lobster 1.4'), local('Lobster-1.4'), url(Lobster-1.4.woff) format('woff');}

@font-face {font-family: 'Crimson Text';\r
font-style: italic;\r
font-weight: 700;\r
src: local('Crimson Text Bold Italic'), local('CrimsonText-BoldItalic'), url(CrimsonText-BoldItalic.woff) format('woff');}

@font-face {font-family: 'Crimson Text';\r
font-style: italic;\r
font-weight: 400;\r
src: local('Crimson Text Italic'), local('CrimsonText-Italic'), url(CrimsonText-Italic.woff) format('woff');}

@font-face {font-family: 'Crimson Text';\r
font-style: normal;\r
font-weight: 700;\r
src: local('Crimson Text Bold'), local('CrimsonText-Bold'), url(CrimsonText-Bold.woff) format('woff');}

@font-face {font-family: 'Crimson Text';\r
font-style: normal;\r
font-weight: 400;\r
src: local('Crimson Text'), local('CrimsonText-Roman'), url(CrimsonText-Roman.woff) format('woff');}
@font-face {font-family: 'JetBrains Mono';
font-style: normal;
font-weight: 400;
src: local('JetBrains Mono'), local('JetBrainsMono-Regular'), url(JetBrainsMono-Regular.woff) format('woff');}
@font-face {font-family: 'JetBrains Mono';
font-style: normal;
font-weight: 700;
src: local('JetBrains Mono Bold'), local('JetBrainsMono-Bold'), url(JetBrainsMono-Bold.woff) format('woff');}

.user-contents {\r
    font-family: 'Crimson Text', serif;\r
    font-weight: 400;\r
    font-size: 1.2em;\r
    /*text-align: justify;*/\r
    word-wrap: break-word;\r
}\r
\r
.doc-authors, .doc-keywords  {\r
    line-height: 1.6em;\r
}\r
\r
.doc-title {\r
    font-family: 'Lobster 1.4', sans-serif;\r
    font-size: 48px;\r
    font-weight: 700;\r
    text-align: center;\r
}\r
\r
.doc-subtitle {\r
    font-family: 'Lobster 1.4', sans-serif;\r
    font-size: 40px;\r
    font-weight: 900;\r
}\r
\r
.doc-abstract {\r
    margin-left: 50px;\r
    margin-right: 50px;\r
}\r
\r
.doc-part.metadata {\r
    margin-bottom: 20px;\r
}\r
\r
.pagination-footnote:before,\r
.pagination-footnote > * > *:first-child:before {\r
    font-family: 'Crimson Text', serif;\r
    font-weight: 700;\r
    font-size: 9px;\r
    text-align: left;\r
    font-style: normal;\r
    vertical-align: super;\r
    line-height: 0;\r
}\r
\r
.pagination-footnote > * > *:first-child:before {\r
    margin-right: 5px;\r
}\r
\r
.pagination-footnote > * > * {\r
    font-family: 'Crimson Text', serif;\r
    font-weight: 400;\r
    font-size: 13px;\r
    line-height: 1.35em;\r
}\r
\r
.pagination-pagenumber {\r
    font-family: 'Lobster 1.4', sans-serif;\r
    font-size: 12px;\r
    font-weight: 400;\r
    text-align: center !important;\r
}\r
\r
.pagination-footnotes {\r
    margin-top: 25px;\r
}\r
\r
.user-contents h1,\r
.user-contents h2,\r
.user-contents h3,\r
.user-contents h4,\r
.user-contents h5,\r
.user-contents h6,\r
.user-contents p,\r
.user-contents blockquote,\r
.user-contents code,\r
.user-contents ol,\r
.user-contents ul {\r
    margin-bottom: 35px;\r
}\r
\r
.user-contents h1,\r
.user-contents h2,\r
.user-contents h3,\r
.user-contents h4,\r
.user-contents h5,\r
.user-contents h6 {\r
    font-family: 'Lobster 1.4', sans-serif;\r
    font-weight: 400;\r
    line-height: 1.35em;\r
    text-align: center;\r
}\r
\r
.user-contents h1  {\r
    font-size: 25px;\r
}\r
\r
.user-contents h2 {\r
    font-size: 23px;\r
}\r
\r
.user-contents h3 {\r
    font-size: 21px;\r
}\r
\r
.user-contents h4 {\r
    font-size: 19px;\r
}\r
\r
.user-contents h5 {\r
    font-size: 17px;\r
}\r
\r
.user-contents h6 {\r
    font-size: 15px;\r
}\r
\r
.user-contents p,\r
.user-contents ol li,\r
.user-contents ul li {\r
    font-size: 20px;\r
    line-height: 1.4em;\r
}\r
\r
.user-contents strong {\r
    font-weight: 700;\r
}\r
\r
.user-contents em {\r
    font-style: italic;\r
}\r
\r
.user-contents ul,\r
.user-contents ol {\r
    padding-left: 15px;\r
}\r
.user-contents ul {\r
    list-style: disc;\r
}\r
\r
.user-contents ol {\r
    list-style: decimal;\r
}\r
\r
.user-contents blockquote {\r
    font-style: italic;\r
    margin-left: 20px;\r
    margin-right: 20px;\r
    font-size: 20px;\r
    line-height: 1.4em;\r
}\r
\r
.user-contents code {\r
    display: block;\r
    font-family: "JetBrains Mono", "DejaVu Sans Mono", monospace;\r
    font-size: 13px;\r
    line-height: 1.75em;\r
}\r
\r
.doc-bibliography p {\r
    font-size: 14px;\r
    margin-bottom: 18px;\r
}\r
.equation {\r
    font-size: 260%;\r
}\r
\r
.pagination-page .pagination-contents-container {\r
    right: 80px !important;\r
    left: 80px !important;\r
}\r
@page {@bottom-center {font-family: 'Lobster 1.4', sans-serif; font-weight: 400;}}`,files:["CrimsonText-Roman.woff","CrimsonText-Bold.woff","CrimsonText-Italic.woff","CrimsonText-BoldItalic.woff","Lobster-1.4.woff","JetBrainsMono-Regular.woff","JetBrainsMono-Bold.woff"]},{title:"Drowsy Owl",slug:"owl",contents:`@font-face {font-family: 'Open Sans';\r
font-style: normal;\r
font-weight: 700;\r
src: local('Open Sans Bold'), local('OpenSans-Bold'), url(OpenSans-Bold.woff) format('woff');}

@font-face {font-family: 'Open Sans';\r
font-style: normal;\r
font-weight: 400;\r
src: local('Open Sans'), local('OpenSans-Regular'), url(OpenSans-Regular.woff) format('woff');}

@font-face {font-family: 'Cardo';\r
font-style: italic;\r
font-weight: 400;\r
src: local('Cardo Italic'), local('Cardo-Italic'), url(Cardo-Italic.woff) format('woff');}

@font-face {font-family: 'Cardo';\r
font-style: normal;\r
font-weight: 700;\r
src: local('Cardo Bold'), local('Cardo-Bold'), url(Cardo-Bold.woff) format('woff');}

@font-face {font-family: 'Cardo';\r
font-style: normal;\r
font-weight: 400;\r
src: local('Cardo'), local('Cardo-Regular'), url(Cardo-Regular.woff) format('woff');}
@font-face {font-family: 'JetBrains Mono';
font-style: normal;
font-weight: 400;
src: local('JetBrains Mono'), local('JetBrainsMono-Regular'), url(JetBrainsMono-Regular.woff) format('woff');}
@font-face {font-family: 'JetBrains Mono';
font-style: normal;
font-weight: 700;
src: local('JetBrains Mono Bold'), local('JetBrainsMono-Bold'), url(JetBrainsMono-Bold.woff) format('woff');}

.user-contents {\r
    font-family: 'Cardo', serif;\r
    font-weight: 400;\r
    font-size: 1.2em;\r
    /*text-align: justify;*/\r
    \r
    word-wrap: break-word;\r
}\r
.doc-authors,\r
.doc-keywords {\r
    line-height: 1.6em;\r
}\r
.doc-title {\r
    font-family: 'Open Sans', sans-serif;\r
    font-size: 48px;\r
    font-weight: 700;\r
}\r
.doc-subtitle {\r
    font-family: 'Open Sans', sans-serif;\r
    font-size: 40px;\r
    font-weight: 900;\r
}\r
.doc-abstract {\r
    margin-left: 50px;\r
    margin-right: 50px;\r
}\r
.doc-part.metadata {\r
    margin-bottom: 20px;\r
}\r
.pagination-footnote:before,\r
.pagination-footnote > * > *:first-child:before {\r
    font-family: 'Cardo', serif;\r
    font-weight: 700;\r
    font-size: 9px;\r
    text-align: left;\r
    font-style: normal;\r
    vertical-align: super;\r
    line-height: 0;\r
}\r
.pagination-footnote > * > *:first-child:before {\r
    margin-right: 5px;\r
}\r
.pagination-footnote > * > * {\r
    font-family: 'Cardo', serif;\r
    font-weight: 400;\r
    font-size: 12px;\r
    line-height: 1.35em;\r
}\r
.pagination-pagenumber {\r
    font-family: 'Open Sans', sans-serif;\r
    font-size: 12px;\r
    font-weight: 400;\r
    text-align: center !important;\r
    line-height: 30px;\r
    right: auto !important;\r
    left: 50% !important;\r
    width: 60px;\r
    height: 30px;\r
    background-color: #f3f3f3;\r
    -webkit-border-radius: 15px;\r
    border-radius: 15px;\r
    vertical-align: middle;\r
    margin-left: -25px;\r
}\r
.pagination-footnotes {\r
    margin-top: 25px;\r
}\r
.user-contents h1,\r
.user-contents h2,\r
.user-contents h3,\r
.user-contents h4,\r
.user-contents h5,\r
.user-contents h6,\r
.user-contents p,\r
.user-contents blockquote,\r
.user-contents code,\r
.user-contents ol,\r
.user-contents ul {\r
    margin-bottom: 35px;\r
}\r
.user-contents h1,\r
.user-contents h2,\r
.user-contents h3,\r
.user-contents h4,\r
.user-contents h5,\r
.user-contents h6 {\r
    font-family: 'Open Sans', sans-serif;\r
    font-weight: 400;\r
    line-height: 1.35em;\r
    text-align: left;\r
}\r
.user-contents h1 {\r
    font-size: 28px;\r
}\r
.user-contents h2 {\r
    font-size: 26px;\r
}\r
.user-contents h3 {\r
    font-size: 24px;\r
}\r
.user-contents h4 {\r
    font-size: 22px;\r
}\r
.user-contents h5 {\r
    font-size: 20px;\r
}\r
.user-contents h6 {\r
    font-size: 18px;\r
}\r
.user-contents p,\r
.user-contents ol li,\r
.user-contents ul li {\r
    font-size: 18px;\r
    line-height: 1.5em;\r
}\r
.user-contents strong {\r
    font-weight: 700;\r
}\r
.user-contents em {\r
    font-style: italic;\r
}\r
.user-contents ul,\r
.user-contents ol {\r
    padding-left: 15px;\r
}\r
.user-contents ul {\r
    list-style: disc;\r
}\r
.user-contents ol {\r
    list-style: decimal;\r
}\r
.user-contents blockquote {\r
    font-style: italic;\r
    margin-left: 50px;\r
    font-size: 18px;\r
    line-height: 1.5em;\r
}\r
.user-contents code {\r
    display: block;\r
    font-family: "JetBrains Mono", "DejaVu Sans Mono", monospace;\r
    font-size: 13px;\r
    line-height: 1.75em;\r
}\r
.doc-bibliography p {\r
    font-size: 14px;\r
    margin-bottom: 18px;\r
}\r
.equation {\r
    font-size: 80%;\r
}\r
.pagination-contents-container {\r
    bottom: 120px;\r
    top: 80px;\r
    height: auto;\r
}\r
@page {@bottom-center {font-family: 'Open Sans', sans-serif; font-weight: 400;}}`,files:["Cardo-Regular.woff","Cardo-Bold.woff","Cardo-Italic.woff","OpenSans-Regular.woff","OpenSans-Bold.woff","JetBrainsMono-Regular.woff","JetBrainsMono-Bold.woff"]},{title:"ACM",slug:"acm",contents:`@font-face {font-family: 'Noticia Text';\r
font-style: italic;\r
font-weight: 700;\r
src: local('Noticia Text Bold Italic'), local('NoticiaText-BoldItalic'), url(NoticiaText-BoldItalic.woff) format('woff');}

@font-face {font-family: 'Noticia Text';\r
font-style: italic;\r
font-weight: 400;\r
src: local('Noticia Text Italic'), local('NoticiaText-Italic'), url(NoticiaText-Italic.woff) format('woff');}

@font-face {font-family: 'Noticia Text';\r
font-style: normal;\r
font-weight: 400;\r
src: local('Noticia Text'), local('NoticiaText-Regular'), url(NoticiaText-Regular.woff) format('woff');}

@font-face {font-family: 'Noticia Text';\r
font-style: normal;\r
font-weight: 700;\r
src: local('Noticia Text Bold'), local('NoticiaText-Bold'), url(NoticiaText-Bold_2.woff) format('woff');}
@font-face {font-family: 'JetBrains Mono';
font-style: normal;
font-weight: 400;
src: local('JetBrains Mono'), local('JetBrainsMono-Regular'), url(JetBrainsMono-Regular.woff) format('woff');}
@font-face {font-family: 'JetBrains Mono';
font-style: normal;
font-weight: 700;
src: local('JetBrains Mono Bold'), local('JetBrainsMono-Bold'), url(JetBrainsMono-Bold.woff) format('woff');}

.user-contents {\r
    font-family: 'Noticia Text', serif;\r
    font-weight: 400;\r
    line-height: 18pt;\r
    text-align: justify;\r
    word-wrap: break-word;\r
    hyphens: auto;\r
}\r
div#flow {\r
    font-size: 12pt;\r
}\r
div#print {\r
    font-size: 9pt;\r
}\r
div#print,\r
div#flow,\r
body {\r
    counter-reset: footnote-counter footnote-marker-counter heading section subsection figure-cat-0 figure-cat-1 figure-cat-2 !important;\r
}\r
.doc-title {\r
    font-family: 'Source Sans Pro', sans-serif;\r
    margin: 0 0 0.333em;\r
    font-size: 2em;\r
    font-weight: 700;\r
    text-transform: capitalize;\r
}\r
div#print .doc-title {\r
    justify-content: center;\r
    display: flex;\r
    align-items: center;\r
}\r
.doc-subtitle {\r
    font-family: 'Source Sans Pro', sans-serif;\r
    font-size: 1.6em;\r
    font-weight: 400;\r
}\r
div#print .doc-subtitle {\r
    justify-content: center;\r
}\r
.doc-authors {\r
    font-family: 'Source Sans Pro', sans-serif;\r
    font-weight: 400;\r
    break-after: always;\r
    font-size: 1.25em;\r
    margin-top: 20px;\r
    margin-bottom: 20px;\r
    text-decoration: none;\r
}\r
div#print .doc-authors {\r
    display: center;\r
    text-align: center;\r
}\r
.doc-abstract {\r
    margin: 0 0 0.5em;\r
    line-height: 15pt;\r
}\r
.doc-part.doc-abstract::before {\r
    content: 'ABSTRACT';\r
    color: black;\r
    font-weight: 700;\r
}\r
div#print .doc-abstract {\r
    column-count: 2;\r
    column-fill: auto;\r
    -moz-column-count: 2;\r
}\r
.doc-part.doc-keywords::before {\r
    content: 'Keywords\\A';\r
    color: black;\r
    font-weight: 700;\r
}\r
.doc-keywords {\r
    margin: 0 -10 0.5em;\r
    line-height: 15pt;\r
}\r
.doc-part.metadata {\r
    margin-top: 30px;\r
    margin-bottom: 40px;\r
    line-height: 25px;\r
}\r
.pagination-footnote:before,\r
.pagination-footnote > * > *:first-child:before {\r
    font-family: 'Noticia Text', serif;\r
    font-weight: 700;\r
    font-size: 1em;\r
    text-align: left;\r
    font-style: normal;\r
    vertical-align: super;\r
    line-height: 0;\r
}\r
.pagination-footnote > * > *:first-child:before {\r
    margin-right: 5px;\r
}\r
.pagination-footnote > * > * {\r
    font-family: 'Noticia Text', serif;\r
    font-weight: 400;\r
    font-size: 1.1em;\r
    line-height: 1.35em;\r
}\r
.pagination-pagenumber {\r
    font-family: 'Source Sans Pro', sans-serif;\r
    font-size: 1em;\r
    font-weight: 400;\r
    text-align: center !important;\r
}\r
.pagination-footnotes {\r
    margin-top: 25px;\r
}\r
.user-contents h1,\r
.user-contents h2,\r
.user-contents h3,\r
.user-contents h4,\r
.user-contents p,\r
.user-contents dl,\r
.user-contents blockquote,\r
.user-contents code,\r
.user-contents ol,\r
.user-contents ul {\r
    margin-bottom: 18px;\r
}\r
.user-contents h1,\r
.user-contents h2,\r
.user-contents h3,\r
.user-contents h4,\r
.user-contents h5,\r
.user-contents h6 {\r
    font-family: 'Noticia Text', serif;\r
    font-weight: 700;\r
    hyphens: none;\r
    line-height: 1.0 em;\r
}\r
.user-contents h1 {\r
    font-size: 1.4em;\r
    font-weight: 700;\r
}\r
.user-contents h2 {\r
    font-size: 1.3em;\r
    font-weight: 700;\r
}\r
.user-contents h3 {\r
    font-size: 1.2em;\r
    font-weight: 700;\r
}\r
.user-contents h4 {\r
    margin: 1.33333333em 0 0 0;\r
    font-size: 1.1em;\r
    font-weight: 400;\r
    font-style: italic;\r
}\r
.user-contents h5 {\r
    margin: 1.33333333em 0 0 0;\r
    font-size: 1.1em;\r
    font-weight: 400;\r
    font-variant: small-caps;\r
}\r
.user-contents h6 {\r
    margin: 1.33333333em 0 0 0;\r
    font-size: 1.1em;\r
    font-weight: 400;\r
    text-decoration: underline;\r
}\r
div#print .doc-body {\r
    column-count: 2;\r
    column-fill: auto;\r
    -moz-column-count: 2;\r
}\r
.doc-body h1:before {\r
    counter-increment: heading;\r
    /* add 1 to heading */\r
    \r
    content: counter(heading) ". ";\r
}\r
.doc-body h1 {\r
    counter-reset: subheading section;\r
    /* set section to 0 */\r
}\r
.doc-body h2:before {\r
    content: counter(heading) "." counter(subheading) " ";\r
    counter-increment: subheading subsection;\r
}\r
.doc-body h2 {\r
    counter-reset: section;\r
}\r
.doc-body h3:before {\r
    content: counter(heading) "." counter(subheading) "." counter(section) " ";\r
    counter-increment: section;\r
}\r
.doc-body h3 {\r
    counter-reset: subsection;\r
}\r
div#print .doc-body,\r
.pagination-footnote > * > * {\r
    font-size: 1em;\r
}\r
/*unordered lists (<ul>) - the list items are marked with bullets*/\r
/*ordered lists (<ol>) - the list items are marked with numbers or letters*/\r
/*Anything added to the <ol> or <ul> tag, affects the entire list, while properties added to the <li> tag will affect the individual list items*/\r
\r
.user-contents p,\r
.user-contents ol li,\r
.user-contents ul li {\r
    font-size: 1em;\r
    margin: 0 0 0.5em;\r
    line-height: 18pt;\r
    text-indent: 0;\r
    counter-reset: figures;\r
}\r
.user-contents strong,\r
div#print strong {\r
    font-weight: 700;\r
}\r
.user-contents em,\r
div#print em {\r
    font-style: italic;\r
}\r
.user-contents ul,\r
.user-contents ol {\r
    padding-left: 15px;\r
}\r
.user-contents ul {\r
    list-style: disc;\r
    /*A filled circle*/\r
}\r
.user-contents ol {\r
    list-style: decimal;\r
}\r
.user-contents blockquote {\r
    font-style: italic;\r
    margin-left: 20px;\r
    margin-right: 20px;\r
    font-size: 1.8em;\r
    line-height: 1.4em;\r
}\r
.user-contents code {\r
    display: block;\r
    font-family: "JetBrains Mono", "DejaVu Sans Mono", monospace;\r
    font-size: 1.1em;\r
    line-height: 1.75em;\r
    white-space: pre-line;\r
}\r
.doc-bibliography p {\r
    font-size: 1.2em;\r
    margin-bottom: 18px;\r
}\r
.figure {\r
    counter-increment: figures;\r
}\r
.figcaption:before {\r
    content: "Fig. " counter(figures) " - ";\r
}\r
.equation {\r
    margin: 3pt 0;\r
    align-items: center;\r
    justify-content: center;\r
    font-size: 1.1em;\r
}\r
.pagination-page .pagination-contents-container {\r
    right: 80px !important;\r
    left: 80px !important;\r
}\r
.pagination-page .pagination-main-contents-container {\r
    height: 927px;\r
}\r
div#print table {\r
    border-collapse: initial;\r
    border-spacing: initial;\r
    margin-bottom: 30px;\r
}\r
div#print tr,\r
div#print td {\r
    padding: 4px;\r
    border: 1px solid black;\r
}\r
div#print figure {\r
    margin: 0 0 30px 0;\r
}\r
.doc-bibliography-header {\r
    text-transform: 'uppercase';\r
}\r
div#print .doc-bibliography {\r
    margin-top: 30px;\r
    column-count: 2;\r
    column-fill: auto;\r
    -moz-column-count: 2;\r
}\r
@page {@bottom-center {font-family: 'Source Sans Pro', sans-serif; font-weight: 400;}}`,files:["NoticiaText-Bold_2.woff","NoticiaText-Regular.woff","NoticiaText-Italic.woff","NoticiaText-BoldItalic.woff","JetBrainsMono-Regular.woff","JetBrainsMono-Bold.woff"]},{title:"Springer",slug:"springer",contents:`@font-face {font-family: 'Source Sans Pro';\r
font-style: normal;\r
font-weight: 700;\r
src: local('Source Sans Pro Bold'), local('SourceSansPro-Bold'), url(SourceSansPro-Bold.woff) format('woff');}

@font-face {font-family: 'Noticia Text';\r
font-style: italic;\r
font-weight: 700;\r
src: local('Noticia Text Bold Italic'), local('NoticiaText-BoldItalic'), url(NoticiaText-BoldItalic.woff) format('woff');}

@font-face {font-family: 'Noticia Text';\r
font-style: italic;\r
font-weight: 400;\r
src: local('Noticia Text Italic'), local('NoticiaText-Italic'), url(NoticiaText-Italic.woff) format('woff');}

@font-face {font-family: 'Noticia Text';\r
font-style: normal;\r
font-weight: 400;\r
src: local('Noticia Text'), local('NoticiaText-Regular'), url(NoticiaText-Regular.woff) format('woff');}

@font-face {font-family: 'Noticia Text';\r
font-style: normal;\r
font-weight: 700;\r
src: local('Noticia Text Bold'), local('NoticiaText-Bold'), url(NoticiaText-Bold_2.woff) format('woff');}
@font-face {font-family: 'JetBrains Mono';
font-style: normal;
font-weight: 400;
src: local('JetBrains Mono'), local('JetBrainsMono-Regular'), url(JetBrainsMono-Regular.woff) format('woff');}
@font-face {font-family: 'JetBrains Mono';
font-style: normal;
font-weight: 700;
src: local('JetBrains Mono Bold'), local('JetBrainsMono-Bold'), url(JetBrainsMono-Bold.woff) format('woff');}@font-face {font-family: 'Source Sans Pro';\r
font-style: normal;\r
font-weight: 400;\r
src: local('Source Sans Pro'), local('SourceSansPro-Regular'), url(SourceSansPro-Regular.woff) format('woff');}

div#print {\r
    font-size: 9pt;\r
}\r
div#flow {\r
    font-size: 12pt;\r
}\r
.user-contents {\r
    font-family: 'Noticia Text', serif;\r
    font-weight: 400;\r
    line-height: 1.25em;\r
    text-align: justify;\r
    word-wrap: break-word;\r
    hyphens: auto;\r
}\r
div#print,\r
div#flow,\r
body {\r
    counter-reset: footnote-counter footnote-marker-counter heading section subsection figure-cat-0 figure-cat-1 figure-cat-2 !important;\r
}\r
.doc-title {\r
    margin-bottom: 30px;\r
    font-size: 2em;\r
    font-weight: 700;\r
    text-transform: initial;\r
}\r
.doc-title,\r
.doc-part.metadata {\r
    padding-left: 50px;\r
    padding-right: 50px;\r
}\r
div#print .doc-title {\r
    display: flex;\r
    justify-content: center;\r
    text-align: center;\r
    align-items: center;\r
}\r
.doc-subtitle {\r
    font-size: 1.5em;\r
    font-weight: 400;\r
    display: inline;\r
    text-align: justify;\r
}\r
div#print .doc-subtitle:not([data-hidden]) {\r
    display: flex;\r
    justify-content: center;\r
}\r
.doc-authors {\r
    font-weight: 400;\r
    break-after: always;\r
    font-size: 1em;\r
    text-decoration: none;\r
    margin-top: 20pt;\r
    margin-bottom: 20pt;\r
    -moz-hyphens: none;\r
    -webkit-hyphens: none;\r
    -ms-hyphens: none;\r
    hyphens: none;\r
}\r
div#print .doc-authors {\r
    text-align: center;\r
}\r
.doc-abstract {\r
    font-size: 0.9em;\r
    margin: 1cm 0 0;\r
    line-height: 0.999000;\r
    min-height: 1.5em;\r
    text-align: justify;\r
}\r
.doc-part.doc-abstract:before {\r
    content: '';\r
}\r
.doc-abstract > p:first-child:before {\r
    content: 'Abstract. ';\r
    color: black;\r
    font-weight: 700;\r
}\r
.doc-keywords {\r
    font-size: 0.9em;\r
    padding: 0 2.5em;\r
    margin: 15px 0 0;\r
    line-height: 1.2em;\r
    text-align: justify;\r
}\r
.doc-part.metadata.doc-keywords:before {\r
    content: 'Keywords: ';\r
    color: black;\r
    font-weight: 700;\r
}\r
.doc-part.metadata {\r
    margin-top: 30px;\r
    margin-bottom: 20px;\r
    line-height: 18px;\r
}\r
.pagination-footnote:before,\r
.pagination-footnote > * > *:first-child:before {\r
    font-weight: 400;\r
    font-size: 1em;\r
    text-align: center;\r
    font-style: normal;\r
    vertical-align: super;\r
    line-height: 0;\r
}\r
.pagination-footnote > * > *:first-child:before {\r
    margin-right: 5px;\r
}\r
.pagination-footnote > * > * {\r
    font-weight: 400;\r
    font-size: 1.3em;\r
    line-height: 1.35em;\r
}\r
.pagination-pagenumber {\r
    font-size: 1.25em;\r
    font-weight: 400;\r
    text-align: left !important;\r
}\r
.pagination-footnotes {\r
    padding-top: 25px;\r
}\r
figure {\r
    font-style: italic;\r
    font-size: 1.25em;\r
}\r
.user-contents h1,\r
.user-contents h2,\r
.user-contents h3,\r
.user-contents h4,\r
.user-contents h5,\r
.user-contents h6,\r
.user-contents p,\r
.user-contents dl,\r
.user-contents blockquote,\r
.user-contents code,\r
.user-contents ol,\r
.user-contents ul {\r
    margin-bottom: 12px;\r
    margin-top: 12px;\r
}\r
.user-contents h1,\r
.user-contents h2,\r
.user-contents h3,\r
.user-contents h4,\r
.user-contents h5,\r
.user-contents h6 {\r
    hyphens: none;\r
    line-height: 1.5em;\r
    font-size: 1em;\r
}\r
.user-contents h1 {\r
    font-size: 1.4em;\r
    font-weight: 700;\r
}\r
.user-contents h2 {\r
    font-size: 1.3em;\r
    font-weight: 700;\r
}\r
.user-contents h3 {\r
    font-size: 1.2em;\r
    font-weight: 700;\r
}\r
.user-contents h4 {\r
    font-size: 1.1em;\r
    font-weight: 400;\r
    font-style: italic;\r
}\r
.user-contents h5 {\r
    font-size: 1.1em;\r
    font-weight: 400;\r
    font-variant: small-caps;\r
}\r
.user-contents h6 {\r
    font-size: 1.1em;\r
    font-weight: 400;\r
    text-decoration: underline;\r
}\r
.doc-body h1:not(:empty):before {\r
    counter-increment: heading;\r
    /* add 1 to heading */\r
    \r
    content: counter(heading) " ";\r
    width: 2em;\r
    display: inline-block;\r
}\r
.doc-body h1:not(:empty) {\r
    counter-reset: subheading section;\r
    /* set section to 0 */\r
}\r
.doc-body h2:not(:empty):before {\r
    content: counter(heading) "." counter(subheading) " ";\r
    counter-increment: subheading subsection;\r
    width: 2em;\r
    display: inline-block;\r
}\r
.doc-body h2:not(:empty) {\r
    counter-reset: section;\r
}\r
.doc-body h3:not(:empty):before {\r
    content: counter(heading) "." counter(subheading) "." counter(section) " ";\r
    counter-increment: section;\r
    width: 2em;\r
    display: inline-block;\r
}\r
.doc-body h3:not(:empty) {\r
    counter-reset: subsection;\r
}\r
div#print .doc-body,\r
.pagination-footnote > * > * {\r
    font-size: 1em;\r
}\r
/*unordered lists (<ul>) - the list items are marked with bullets*/\r
/*ordered lists (<ol>) - the list items are marked with numbers or letters*/\r
/*Anything added to the <ol> or <ul> tag, affects the entire list, while properties added to the <li> tag will affect the individual list items*/\r
\r
.user-contents p,\r
.user-contents ol li,\r
.user-contents ul li {\r
    font-size: 1em;\r
    margin: auto;\r
    line-height: 1.4em;\r
    text-indent: 0;\r
    margin-block-start: 7px;\r
    margin-inline-start: 5px;\r
}\r
.user-contents strong {\r
    font-weight: 700;\r
}\r
.user-contents em {\r
    font-style: italic;\r
}\r
.user-contents ul,\r
.user-contents ol {\r
    padding-left: 15px;\r
}\r
.user-contents ul {\r
    list-style: disc;\r
    /*A filled circle*/\r
}\r
.user-contents ol {\r
    list-style: decimal;\r
}\r
.user-contents blockquote {\r
    font-style: italic;\r
    margin-left: 10px;\r
    margin-right: 10px;\r
    font-size: 2.2em;\r
    line-height: 2.3em;\r
}\r
.user-contents code {\r
    display: block;\r
    font-family: "JetBrains Mono", "DejaVu Sans Mono", monospace;\r
    font-size: 1.3em;\r
    line-height: 1.75em;\r
}\r
#flow .doc-bibliography {\r
    background-color: lightgrey;\r
}\r
#flow .doc-bibliography p {\r
    font-size: 1.4em;\r
    margin-bottom: 18px;\r
}\r
#flow .doc-bibliography ol li {\r
    counter-increment: list-order;\r
    list-style-position: outside;\r
    list-style-type: none;\r
    margin-left: 1.1em;\r
    font-size: 0.923em;\r
}\r
.equation {\r
    margin: 3pt 0;\r
    align-items: center;\r
    justify-content: center;\r
    font-size: 1.3em;\r
}\r
.pagination-page .pagination-main-contents-container {\r
    height: 957px;\r
}\r
div#print table {\r
    border-collapse: initial;\r
    border-spacing: initial;\r
    margin-bottom: 10px;\r
}\r
div#print tr,\r
div#print td {\r
    padding: 4px;\r
    border: 1px solid black;\r
}\r
div#print figure {\r
    margin: 0 0 10px 0;\r
}`,files:["NoticiaText-Bold_2.woff","NoticiaText-Regular.woff","NoticiaText-Italic.woff","NoticiaText-BoldItalic.woff","SourceSansPro-Bold.woff","JetBrainsMono-Regular.woff","JetBrainsMono-Bold.woff","SourceSansPro-Regular.woff"]}],exportTemplates:[{title:"Classic",file_type:"docx",file:"Classic.docx"},{title:"Free",file_type:"odt",file:"Free.odt"}]};export{t as a};
//# sourceMappingURL=chunk-JC6MYD7Q.js.map
