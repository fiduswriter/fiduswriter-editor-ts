import{a as A,b as z}from"./chunk-F2BF4YWV.js";import{a as E,c as F,d as S}from"./chunk-TD3AQEE7.js";import{a as q}from"./chunk-YRHTAYIK.js";import{a as M,c as C,d as O}from"./chunk-HDMNXDG5.js";import{d as I}from"./chunk-COU53FUL.js";import{E as T}from"./chunk-YP7RNY6H.js";import{f as B}from"./chunk-RXN25P3O.js";import{d as L,e as p}from"./chunk-GADWB3Y5.js";var H=L(O(),1);var Z=new Set(["\\","*","_","[","]","~","^","|","$","<",">",'"',"`"]);function D(g,e=!1){let t="";for(let n=0;n<g.length;n++){let i=g[n];Z.has(i)?t+=`\\${i}`:e&&n===0&&(i==="#"||i==="-"||i==="+")?t+=`\\${i}`:t+=i}return t}function f(g){return String(g).replace(/\\/g,"\\\\").replace(/"/g,'\\"')}function N(g,e){let t=g.match(/~{3,}/g)?.reduce((i,a)=>Math.max(i,a.length),3),n=Math.max(3,(t||3)+1,e||0);return{fence:"~".repeat(n),content:g.endsWith(`
`)?g:`${g}
`}}function W(g){return D(g).replace(/\n/g," ")}function J(g){switch(g){case"heading_part":return"heading";case"richtext_part":return"richtext";case"contributors_part":return"contributors";case"tags_part":return"tags";case"table_part":return"table";default:return g}}var _=class{constructor(e,t,n){p(this,"settings");p(this,"imageDB");p(this,"bibDB");p(this,"imageIds");p(this,"usedBibDB");p(this,"footnotes");p(this,"fnCounter");p(this,"usesCitations");this.settings=n,this.imageDB=e,this.bibDB=t,this.imageIds=[],this.usedBibDB={},this.footnotes=[],this.fnCounter=0,this.usesCitations=!1}init(e){let t=A(e),n=z(t,r=>this.walkBlocks(r)),a=(e.content||[]).filter(r=>{if(r.type==="title"||r.type==="contributors_part"||r.type==="tags_part")return!1;if(r.type==="richtext_part"){let h=r.attrs||{};if(h.metadata==="abstract"||h.id==="abstract")return!1}if(r.type==="heading_part"){let h=r.attrs||{};if(h.metadata==="subtitle"||h.id==="subtitle")return!1}return!0}).map(r=>this.walkPart(r)).join(`
`),s=this.footnotes.length?this.footnotes.map(r=>`[^${r.marker}]: ${this.walkBlocks(r.content,{indent:"    "}).trimStart()}`).join(`

`):"",c=this.usesCitations?`::: {#references .references}
:::`:"";return{markdown:`${[n,a.trimEnd(),s,c].filter(r=>r.length).join(`

`)}
`,imageIds:this.imageIds,usedBibDB:this.usedBibDB}}walkPart(e){let t=e.attrs||{},n=t.id,i=t.metadata,a=t.language,s=[];typeof n=="string"&&n&&n!=="undefined"&&s.push(`#${n}`),s.push(".doc-part",`.doc-${J(e.type)}`),typeof i=="string"&&i&&s.push(`data-metadata="${f(i)}"`),typeof a=="string"&&a&&s.push(`lang="${f(a)}"`);let c="";if(e.type==="table_part"){let r=e.content?.find(h=>h.type==="table");r&&(c=this.tableAttributes(r),r.attrs?.track)}let u=(e.content||[]).map(r=>this.walkBlock(r)).filter(r=>r.length).join(`

`);return`::: {${s.join(" ")}${c}}

${u}

:::`}tableAttributes(e){let t=e.attrs||{},n=[];return t.width&&n.push(`data-width="${f(String(t.width))}"`),t.aligned&&n.push(`data-aligned="${f(String(t.aligned))}"`),t.layout&&n.push(`data-layout="${f(String(t.layout))}"`),t.category&&t.category!=="none"&&n.push(`data-category="${f(String(t.category))}"`),n.length?` ${n.join(" ")}`:""}walkBlocks(e,t={}){let i=e.map(c=>this.walkBlock(c)).filter(c=>c.length).join(`

`),a=t.indent||"",s=t.quote;return i.split(`
`).map(c=>{let u=c.length?`${a}${c}`:a.replace(/\S/g," ");return s&&u.length&&(u=`> ${u}`),u}).join(`
`)}walkBlock(e){switch(e.type){case"paragraph":return this.walkInlines(e.content||[],!0);case"heading1":case"heading2":case"heading3":case"heading4":case"heading5":case"heading6":{let t=Number(e.type.slice(-1)),n=this.walkInlines(e.content||[],!0),i=typeof e.attrs?.id=="string"&&e.attrs.id?` {#${e.attrs.id}}`:"";return`${"#".repeat(t)} ${n}${i}`}case"blockquote":return this.walkBlocks(e.content||[],{quote:!0});case"bullet_list":case"ordered_list":return this.walkList(e);case"code_block":return this.walkCodeBlock(e);case"figure":return this.walkFigure(e);case"table":return this.walkTableDiv(e);case"horizontal_rule":return"---";default:return""}}walkList(e){let t=e.type==="ordered_list",n=(e.content||[]).filter(a=>a.type==="list_item"),i=e.attrs?.order||1;return n.map(a=>{let s=t?`${i}. `:"-  ";return t&&i++,(a.content||[]).map((r,h)=>{let m=this.walkBlock(r);return h===0?`${s}${m.replace(/\n/g,`
${" ".repeat(s.length)}`)}`:this.walkBlocks([r],{indent:" ".repeat(s.length)})}).filter(r=>r.length).join(`

`)}).join(`
`)}walkCodeBlock(e){let t=e.attrs||{},n=F(e),{fence:i,content:a}=N(n),s=[];typeof t.language=="string"&&t.language&&s.push(`.${t.language}`),typeof t.id=="string"&&t.id&&s.push(`#${t.id}`),typeof t.category=="string"&&t.category&&s.push(`category="${f(t.category)}"`),typeof t.title=="string"&&t.title&&s.push(`caption="${f(t.title)}"`);let c=s.length?`{${s.join(" ")}}`:"";return`${i}${c}
${a}${i}`}walkFigure(e){let t=e.attrs||{},n=String(t.category||"none"),i=e.content?.find(o=>o.type==="image"),a=e.content?.find(o=>o.type==="figure_equation"),s=e.content?.find(o=>o.type==="figure_caption"),c=t.caption&&s?this.walkInlines(s.content||[]):"";if(a){let o=[];typeof t.id=="string"&&t.id&&o.push(`#${t.id}`),o.push(".doc-figure"),o.push(`data-equation="${f(String(a.attrs?.equation||""))}"`),n!=="none"&&o.push(`data-category="${f(n)}"`);let l=String(a.attrs?.equation||""),w=c?`

${c}`:"";return`:::: {${o.join(" ")}}

$$
${l}
$$${w}

::::`}if(!i)return"";let u=i.attrs?.image,r=u!==void 0?this.imageDB.db[u]:void 0;if(!r)return"";let h=C(r,u);this.imageIds.includes(u)||this.imageIds.push(u);let m=[];if(typeof t.id=="string"&&t.id&&m.push(`#${t.id}`),t.width){let o=String(t.width);m.push(`width=${o}${/^\d+$/.test(o)?"%":""}`)}t.aligned&&m.push(`data-aligned="${f(String(t.aligned))}"`),n!=="none"&&m.push(`data-category="${f(n)}"`);let y=m.length?`{${m.join(" ")}}`:"",$=`images/${h}`;return`![${c}](${$})${y}`}walkTableDiv(e){let t=[".doc-table"],n=String(e.attrs?.id||"");return n&&n!=="undefined"&&t.push(`#${n}`),`::: {${t.join(" ")}${this.tableAttributes(e)}}

${this.walkTable(e)}

:::`}walkTable(e){let t=S(JSON.parse(JSON.stringify(e))),n=t.content?.find(d=>d.type==="table_caption"),a=t.content?.find(d=>d.type==="table_body")?.content||[];if(!a.length)return"";let s=a[0].content||[],c=s.some(d=>d.type==="table_header"),u=s.reduce((d,b)=>d+(b.attrs?.colspan||1),0),r=d=>W(F(d).trim()),h=d=>d.attrs?.rowspan===0&&d.attrs?.colspan===0,m=c?s.filter(d=>!h(d)).map(r):Array.from({length:u},()=>""),y=(c?a.slice(1):a).map(d=>{let b=[];for((d.content||[]).forEach(k=>{if(h(k))return;b.push(r(k));let x=k.attrs?.colspan||1;for(let j=1;j<x;j++)b.push("")});b.length<u;)b.push("");return b}),$=Array.from({length:u},(d,b)=>{let k=[m[b],...y.map(x=>x[b])];return Math.max(3,...k.map(x=>x.length))}),o=d=>`| ${d.map((b,k)=>b.padEnd($[k])).join(" | ")} |`,l=`| ${$.map(d=>"-".repeat(d)).join(" | ")} |`,w=n?.content?.length?this.walkInlines(n.content||[]):"",v=[o(m),l,...y.map(d=>o(d))].join(`
`);return w?`${v}

: ${w}`:v}walkInlines(e,t=!1){let n=!0;return e.map(i=>{let a=i.type==="text",s=this.walkInline(i,t&&n);return a&&(n=!1),s}).join("")}walkInline(e,t=!1){switch(e.type){case"text":return this.walkText(e,t);case"hard_break":return`\\
`;case"equation":{let n=String(e.attrs?.equation||"");return n.includes("$")?`<span class="equation" data-equation="${f(n)}"></span>`:`$${n}$`}case"footnote":return Array.isArray(e.attrs?.footnote)?(this.fnCounter++,this.footnotes.push({marker:this.fnCounter,content:e.attrs.footnote}),`[^${this.fnCounter}]`):"";case"citation":return this.walkCitation(e);case"cross_reference":{let n=String(e.attrs?.id||""),i=String(e.attrs?.title||n);return i?`[${D(i)}](#${n})`:""}default:return""}}walkText(e,t=!1){let n=e.marks||[],i=n.find(l=>l.type==="code"),a=n.find(l=>l.type==="strong"),s=n.find(l=>l.type==="em"),c=n.find(l=>l.type==="underline"),u=n.find(l=>l.type==="sup"),r=n.find(l=>l.type==="sub"),h=n.find(l=>l.type==="link"),m=n.find(l=>l.type==="anchor"),y="",$="";if(m){let l=String(m.attrs?.id||"");y+=`<span id="${f(l)}" class="anchor" data-id="${f(l)}"></span>`}if(i)return this.wrapCode(y+$,String(e.text||""));s&&(y+="*",$=`*${$}`),a&&(y+="**",$=`**${$}`);let o=D(String(e.text||""),t);if(c&&(o=`[${o}]{.underline}`),u&&(o=String(e.text||"").includes(" ")?`<sup>${o}</sup>`:`^${o}^`),r&&(o=String(e.text||"").includes(" ")?`<sub>${o}</sub>`:`~${o}~`),h){let l=String(h.attrs?.href||""),w=h.attrs?.title?` "${f(String(h.attrs.title))}"`:"";o=`[${o}](${l}${w})`}return y+o+$}wrapCode(e,t){let n=t.match(/`+/g)?.reduce((s,c)=>Math.max(s,c.length),0),i="`".repeat(Math.max(1,(n||0)+1)),a=t.startsWith("`")||t.endsWith("`")?" ":"";return`${e}${i}${a}${t}${a}${i}`}walkCitation(e){let t=e.attrs?.references||[],n=String(e.attrs?.format||"autocite");if(!t.length)return"";this.usesCitations=!0;let i=t.map(s=>{let c=this.bibDB.db[s.id];if(!c)return null;this.usedBibDB[s.id]||(this.usedBibDB[s.id]=Object.assign({},c));let u=this.usedBibDB[s.id].entry_key||String(s.id),r=s.locator?`, ${s.locator}`:"",h=s.prefix?s.prefix.endsWith(" ")?s.prefix:`${s.prefix} `:"";return n==="textcite"&&!s.prefix?`@${u}${r}`:`${h}@${u}${r}`}).filter(s=>s!==null);return i.length?n==="textcite"&&i.every(s=>s.startsWith("@"))&&i.length===1?i[0]:`[${i.join("; ")}]`:""}};var P=`Fidus Writer markdown export
============================

This archive contains the document exported to pandoc-flavoured markdown
(document.md) and, when the document contains citations, a bibliography
database (bibliography.bib) with all cited entries.

Reading the document with pandoc
--------------------------------

With pandoc installed, the markdown can be converted to other formats:

    pandoc document.md --citeproc --bibliography bibliography.bib \\
        -o document.html

Citations are exported in pandoc's bracketed citation syntax, e.g.
[@doe2020], so they are resolved either by --citeproc at conversion time or
by any tool that understands pandoc citations.

Format notes
------------

* The markdown uses pandoc's flavour (not GitHub flavoured markdown), as
  only the pandoc flavour supports the attribute blocks, fenced divs and
  bracketed citations used here.
* Document parts are wrapped in fenced divs (::: blocks) carrying the part
  ids and metadata, mirroring Fidus Writer's HTML export.
* Tables are exported as pipe tables. Merged cells (colspan/rowspan) cannot
  be represented in a pipe table; the merged grid is flattened and the
  covering cells appear as empty cells.
* Figure equations are exported as fenced divs with the LaTeX source in the
  data-equation attribute.
`;var R=class{constructor(e,t,n,i,a){p(this,"doc");p(this,"docTitle");p(this,"bibDB");p(this,"imageDB");p(this,"updated");p(this,"docContent");p(this,"zipFileName");p(this,"textFiles");p(this,"httpFiles");p(this,"conversion");p(this,"progressCallback");this.doc=e,this.docTitle=T(this.doc.title,this.doc.path||""),this.bibDB=t,this.imageDB=n,this.updated=i,this.progressCallback=a,this.docContent=!1,this.zipFileName=!1,this.textFiles=[],this.httpFiles=[]}async init(){this.progressCallback?.(B("Exporting to Markdown..."),0),this.zipFileName=`${M(this.docTitle)}.md.zip`,this.docContent=S(E(this.doc.content));let e=new _(this.imageDB,this.bibDB,this.doc.settings);if(this.conversion=e.init(this.docContent),this.progressCallback?.(B("Preparing Markdown files..."),50),this.textFiles.push({filename:"document.md",contents:this.conversion.markdown}),Object.keys(this.conversion.usedBibDB).length>0){let t=new I(this.conversion.usedBibDB);this.textFiles.push({filename:"bibliography.bib",contents:t.parse()})}return this.conversion.imageIds.forEach(t=>{let n=this.imageDB.db[t];if(!n)return;let i=n.image,a=C(n,t);i instanceof Blob?this.httpFiles.push({filename:`images/${a}`,url:`blob:${t}`,blob:i}):i instanceof ArrayBuffer?this.httpFiles.push({filename:`images/${a}`,url:`blob:${t}`,blob:new Blob([i],{type:n.file_type||"image/png"})}):typeof i=="string"&&this.httpFiles.push({filename:`images/${a}`,url:i})}),this.textFiles.push({filename:"README.txt",contents:P}),await this.createZip(),this.progressCallback?.(B("Export to Markdown complete."),100),Promise.resolve()}createZip(){return new q(this.textFiles,this.httpFiles,void 0,void 0,this.updated).init().then(t=>this.download(t))}download(e){return(0,H.default)(e,this.zipFileName,"application/zip")}};export{R as MarkdownExporter};
//# sourceMappingURL=markdown-34VSWJ24.js.map
