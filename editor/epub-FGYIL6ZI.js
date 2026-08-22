import{b as v}from"./chunk-L2U3GEEI.js";import{a as w,c as g}from"./chunk-UL3ZPY3B.js";import"./chunk-ZOUZWMBO.js";import"./chunk-7E6JLV5O.js";import"./chunk-NPYTCIQW.js";import"./chunk-V5IEHUAE.js";import"./chunk-DJTNZFGX.js";import"./chunk-OURL3F7J.js";import"./chunk-ADOOI6TI.js";import"./chunk-LOE3AZ6M.js";import{u as l}from"./chunk-LUSWO74V.js";import{e as u}from"./chunk-GADWB3Y5.js";var y=`
<item id="mathlive-0" href="css/mathlive.css" media-type="text/css" />
<item id="mathlive-1" href="css/media/KaTeX_AMS-Regular.woff2" media-type="font/woff2" />
<item id="mathlive-2" href="css/media/KaTeX_Caligraphic-Bold.woff2" media-type="font/woff2" />
<item id="mathlive-3" href="css/media/KaTeX_Caligraphic-Regular.woff2" media-type="font/woff2" />
<item id="mathlive-4" href="css/media/KaTeX_Fraktur-Bold.woff2" media-type="font/woff2" />
<item id="mathlive-5" href="css/media/KaTeX_Fraktur-Regular.woff2" media-type="font/woff2" />
<item id="mathlive-6" href="css/media/KaTeX_Main-Bold.woff2" media-type="font/woff2" />
<item id="mathlive-7" href="css/media/KaTeX_Main-BoldItalic.woff2" media-type="font/woff2" />
<item id="mathlive-8" href="css/media/KaTeX_Main-Italic.woff2" media-type="font/woff2" />
<item id="mathlive-9" href="css/media/KaTeX_Main-Regular.woff2" media-type="font/woff2" />
<item id="mathlive-10" href="css/media/KaTeX_Math-BoldItalic.woff2" media-type="font/woff2" />
<item id="mathlive-11" href="css/media/KaTeX_Math-Italic.woff2" media-type="font/woff2" />
<item id="mathlive-12" href="css/media/KaTeX_SansSerif-Bold.woff2" media-type="font/woff2" />
<item id="mathlive-13" href="css/media/KaTeX_SansSerif-Italic.woff2" media-type="font/woff2" />
<item id="mathlive-14" href="css/media/KaTeX_SansSerif-Regular.woff2" media-type="font/woff2" />
<item id="mathlive-15" href="css/media/KaTeX_Script-Regular.woff2" media-type="font/woff2" />
<item id="mathlive-16" href="css/media/KaTeX_Size1-Regular.woff2" media-type="font/woff2" />
<item id="mathlive-17" href="css/media/KaTeX_Size2-Regular.woff2" media-type="font/woff2" />
<item id="mathlive-18" href="css/media/KaTeX_Size3-Regular.woff2" media-type="font/woff2" />
<item id="mathlive-19" href="css/media/KaTeX_Size4-Regular.woff2" media-type="font/woff2" />
<item id="mathlive-20" href="css/media/KaTeX_Typewriter-Regular.woff2" media-type="font/woff2" />
`;var T=({id:e,idType:a,title:t,language:i,authors:o,keywords:m,date:f,modified:c,images:n,fontFiles:s,styleSheets:d,math:_,copyright:p})=>`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="${a}" xml:lang="${i}" prefix="cc: http://creativecommons.org/ns#">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:identifier id="${a}">${e}</dc:identifier>
            <dc:title>${l(t)}</dc:title>
${o.map(r=>`		<dc:creator>${l(r)}</dc:creator>
`).join("")}${m.map(r=>`		<dc:subject>${l(r)}</dc:subject>
`).join("")}
        <dc:language>${i}</dc:language>
        <dc:date>${f}</dc:date>
        ${p&&p.holder?`<dc:rights>\xA9 ${p.year?p.year:new Date().getFullYear()} ${l(p.holder)}</dc:rights>`:""}
        <meta property="dcterms:modified">${c}</meta>
    </metadata>
    <manifest>
        <item id="t1" href="document.xhtml" media-type="application/xhtml+xml" />
        <item id="nav" href="document-nav.xhtml" properties="nav" media-type="application/xhtml+xml" />
${n.map((r,h)=>`			<item ${r.coverImage?'id="cover-image" properties="cover-image"':`id="img${h}"`} href="${r.filename}" media-type="${r.mimeType}" />
`).join("")}${s.map((r,h)=>`			<item ${`id="font${h}"`} href="${r.filename}" media-type="${r.mimeType}" />
`).join("")}${d.map((r,h)=>`			<item id="css${h}" href="${r.filename}" media-type="text/css" />
`).join("")}${_?y:""}
        <!-- ncx included for 2.0 reading system compatibility: -->
        <item id="ncx" href="document.ncx" media-type="application/x-dtbncx+xml" />
    </manifest>
    <spine toc="ncx">
        <itemref idref="t1" />
    </spine>
</package>`,$=()=>`<?xml version="1.0" encoding="UTF-8"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
    <rootfiles>
        <rootfile full-path="EPUB/document.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
</container>`,b=({shortLang:e,idType:a,id:t,title:i,toc:o})=>`<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns:ncx="http://www.daisy.org/z3986/2005/ncx/" xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="${e}">
    <head>
        <meta name="dtb:${a}" content="${t}" />
    </head>
    <docTitle>
        <text>${l(i)}</text>
    </docTitle>
    <navMap>
        <!-- 2.01 NCX: playOrder is optional -->
${o.map(m=>F({item:m})).join("")}
    </navMap>
</ncx>`,F=({item:e})=>`        <navPoint id="t${e.docNum?`${e.id}-${e.docNum}`:e.id}">
            <navLabel><text>${l(e.title)}</text></navLabel>
            <content src="${e.link?e.link:e.docNum?`document-${e.docNum}.xhtml#${e.id}`:`document.xhtml#${e.id}`}"/>
${e.children?.map(a=>F({item:a})).join("")||""}
        </navPoint>
`,X=({item:e})=>`				<li><a href="${e.link?e.link:e.docNum?`document-${e.docNum}.xhtml#${e.id}`:`document.xhtml#${e.id}`}">${l(e.title)}</a>
${e.children.length?`<ol>
        ${e.children.map(a=>X({item:a})).join("")}
    </ol>`:""}
</li>`,j=({shortLang:e,toc:a,styleSheets:t})=>`<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${e}" lang="${e}" xmlns:epub="http://www.idpf.org/2007/ops">
    <head>
        <meta charset="utf-8" />
        <title>Navigation</title>
        ${t.map(i=>`<link rel="stylesheet" type="text/css" href="${i.filename}" />
`).join("")}
    </head>
    <body class="epub navigation">
        <nav epub:type="toc" id="toc">
            <ol>
${a.map(i=>X({item:i})).join("")}
            </ol>
        </nav>
    </body>
</html>`;function N(e){let a=e.getUTCSeconds(),t=e.getUTCMinutes(),i=e.getUTCHours(),o=e.getUTCDate(),m=e.getUTCMonth()+1,f=e.getUTCFullYear();return a<10&&(a=+("0"+a)),t<10&&(t=+("0"+t)),i<10&&(i=+("0"+i)),o<10&&(o=+("0"+o)),m<10&&(m=+("0"+m)),`${f}-${m}-${o}T${i}:${t}:${a}Z`}function K(e){let a={ttf:"font/ttf",otf:"font/otf",woff:"font/woff",woff2:"font/woff2",eot:"application/vnd.ms-fontobject"},t=e.split(".").pop()?.toLowerCase();return t&&a[t]||null}function M(e){let a={jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",gif:"image/gif",bmp:"image/bmp",tiff:"image/tiff",webp:"image/webp",svg:"image/svg+xml",ico:"image/vnd.microsoft.icon",avif:"image/avif"},t=e.split(".").pop()?.toLowerCase();return t&&a[t]||null}function x(e){let a=[],t={};return e.forEach(i=>{t[i.level]=t[i.level]||[];let o={...i,children:[]};if(t[i.level].push(o),i.level===0)a.push(o);else{let m=t[i.level-1];m&&m[m.length-1].children.push(o)}}),a}var U=class extends v{constructor(t,i,o,m,f,c,n={},s){super(t,i,o,m,f,c,{xhtml:!0,epub:!0,...n});u(this,"documentFileName");u(this,"lang");u(this,"shortLang");u(this,"progressCallback");this.progressCallback=s,this.documentFileName="document.xhtml",this.contentFileName="document.xhtml",this.fileEnding="epub",this.mimeType="application/epub+zip",this.lang=t.settings.language||"en-US",this.shortLang=this.lang.split("-")[0]}async createZip(){return this.prefixFiles(),await this.createEPUBFiles(),super.createZip()}prefixFiles(){this.textFiles=this.textFiles.map(t=>Object.assign({},t,{filename:`EPUB/${t.filename}`})),this.httpFiles=this.httpFiles.map(t=>Object.assign({},t,{filename:`EPUB/${t.filename}`})),this.includeZips=this.includeZips.map(t=>Object.assign({},t,{directory:`EPUB/${t.directory}`}))}async createEPUBFiles(){this.textFiles.push({filename:"META-INF/container.xml",contents:await g($())},{filename:"EPUB/document.opf",contents:await g(this.createOPF())},{filename:"EPUB/document.ncx",contents:await g(this.createNCX())},{filename:"EPUB/document-nav.xhtml",contents:await w(this.createNav())})}createOPF(){let t=N(this.updated),i=this.httpFiles.map(n=>Object.assign({mimeType:M(n.filename)},n)).filter(n=>n.mimeType),o=this.httpFiles.map(n=>Object.assign({mimeType:K(n.filename)},n)).filter(n=>n.mimeType),m=this.textFiles.filter(n=>n.filename.endsWith(".css")),c=this.converter.metaData.authors.map(n=>{let s=n.attrs||{};if(s.firstname||s.lastname){let d=[];return s.firstname&&d.push(s.firstname),s.lastname&&d.push(s.lastname),d.join(" ")}else if(s.institution)return s.institution}).filter(n=>typeof n=="string");return T({language:this.lang,title:this.docTitle,authors:c,keywords:this.converter.metaData.keywords,idType:"fidus",id:String(this.doc.id),date:t.slice(0,10),modified:t,styleSheets:m,math:this.converter.features.math&&this.converter.mathOutput!=="svg",images:i,fontFiles:o,copyright:this.doc.settings.copyright})}createNCX(){return b({shortLang:this.shortLang,title:this.docTitle,idType:"fidus",id:String(this.doc.id),toc:x(this.converter.metaData.toc)})}createNav(){let t=this.textFiles.filter(i=>i.filename.endsWith(".css"));return j({shortLang:this.shortLang,toc:x(this.converter.metaData.toc),styleSheets:t})}};export{U as EpubExporter};
//# sourceMappingURL=epub-FGYIL6ZI.js.map
