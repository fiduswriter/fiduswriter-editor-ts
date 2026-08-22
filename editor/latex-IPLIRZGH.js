import{a as C,b as T,d as L}from"./chunk-ZOUZWMBO.js";import{a as w,c as k}from"./chunk-NPYTCIQW.js";import{a as v}from"./chunk-DJTNZFGX.js";import{a as q,b as _,c as D,d as F}from"./chunk-OURL3F7J.js";import{d as B}from"./chunk-ADOOI6TI.js";import{E as $}from"./chunk-LOE3AZ6M.js";import{f as m}from"./chunk-LUSWO74V.js";import{d as P,e as g}from"./chunk-GADWB3Y5.js";var j=P(q(),1);var b=x=>x.replace(/\r|\n/g,"").replace(/\{/g,"\\{").replace(/\}/g,"\\}").replace(/\^/g,"\\textasciicircum{}").replace(/\$/g,"\\$").replace(/_/g,"\\_").replace(/~/g,"\\textasciitilde{}").replace(/#/g,"\\#").replace(/%/g,"\\%").replace(/&/g,"\\&").replace(/\\\\/g,"\\textbackslash").replace(/\u000B/g,"").replace(/\u000C/g,"").replace(/\u000E/g,"").replace(/\u000F/g,"");var y=class{constructor(e,a,i,h){g(this,"exporter");g(this,"settings");g(this,"imageDB");g(this,"bibDB");g(this,"imageIds");g(this,"usedBibDB");g(this,"features");g(this,"internalLinks");g(this,"categoryCounter");g(this,"authorsTex");this.exporter=e,this.settings=h,this.imageDB=a,this.bibDB=i,this.imageIds=[],this.usedBibDB={},this.features={},this.internalLinks=[],this.categoryCounter={},this.authorsTex=""}init(e){this.preWalkJson(e);let a=this.walkJson(e),i=this.postProcess(a),h=this.assembleCopyright(),t=this.assemblePreamble(),d=this.assembleEpilogue();return{latex:h+this.docDeclaration+t+this.authorsTex+`
\\begin{document}
`+i+d+`
\\end{document}
`,imageIds:this.imageIds,usedBibDB:this.usedBibDB}}get docDeclaration(){return`\\documentclass{article}
`}preWalkJson(e){switch(e.type){case"text":if(e.marks){let a=e.marks.find(i=>i.type==="link");if(a){let i=a.attrs?.href;i[0]==="#"&&!this.internalLinks.includes(i)&&this.internalLinks.push(i.slice(1))}}break}e.content&&e.content.forEach(a=>this.preWalkJson(a))}walkJson(e,a={}){let i="",h="",t="",d=!1;switch(e.type){case"doc":break;case"title":i+=`
\\title{`,t="}"+t;break;case"heading_part":e.attrs?.metadata==="subtitle"&&e.content?(i+=`
\\subtitle{`,t="}"+t,this.features.subtitle=!0,a=Object.assign({},a),a.ignoreHeading=!0):a.madeTitle||(i+=`

\\maketitle
`,a.madeTitle=!0);break;case"contributor":break;case"contributors_part":if(e.content){let u={authors:m("Authors"),editors:m("Editors"),translators:m("Translators"),reviewers:m("Reviewers"),contributors:m("Contributors")}[e.attrs?.metadata];if(e.attrs?.metadata==="authors"){let l=e.content.map(c=>{let n=c.attrs||{},r=[],s=!1;return n.firstname&&r.push(n.firstname),n.lastname&&r.push(n.lastname),r.length&&n.institution?s=n.institution:n.institution&&r.push(n.institution),{name:r.join(" "),affiliation:s,email:n.email,id_type:n.id_type,id_value:n.id_value}}).reduce((c,n)=>{let r=String(n.affiliation);return c[r]=c[r]||[],c[r].push(n),c},{});Object.values(l).forEach(c=>{c.forEach(n=>{let r="";n.email&&(r+=`\\thanks{${b(n.email)}}`),n.id_type&&n.id_value&&(r+=`\\thanks{${b(n.id_type)}: ${b(n.id_value)}}`),this.authorsTex+=`
\\author{${b(n.name)}${r}}`}),this.authorsTex+=`
\\affil{${c[0].affiliation?b(c[0].affiliation):""}}`}),this.authorsTex+=`

`,this.features.authors=!0}else{a.madeTitle||(i+=`

\\maketitle
`,a.madeTitle=!0);let l=e.content.map(c=>{let n=c.attrs||{},r=[];n.firstname&&r.push(n.firstname),n.lastname&&r.push(n.lastname),!r.length&&n.institution&&r.push(n.institution);let s=r.join(" ");return n.id_type&&n.id_value&&(s+=` (${b(n.id_type)}: ${b(n.id_value)})`),s}).filter(c=>c.length).join(", ");l.length&&(h+=`
\\noindent\\textbf{${u}:} ${l}

`)}}break;case"tags_part":e.content&&(e.attrs?.metadata==="keywords"?(i+=`
\\keywords{`,t="}"+t,this.features.keywords=!0):a.madeTitle||(i+=`

\\maketitle
`,a.madeTitle=!0),h+=e.content.map(o=>b(o.attrs.tag)).join("\\sep "));break;case"tag":break;case"richtext_part":a.madeTitle||(i+=`

\\maketitle
`,a.madeTitle=!0),e.content&&e.attrs?.metadata==="abstract"&&(i+=`
\\begin{abstract}
`,t=`
\\end{abstract}
`+t);break;case"table_of_contents":i+=`

\\tableofcontents
`;break;case"separator_part":case"table_part":break;case"paragraph":i+=`

`,t=`
`+t;break;case"heading1":case"heading2":case"heading3":case"heading4":case"heading5":case"heading6":{if(a.ignoreHeading)break;switch(Number.parseInt(e.type.slice(-1))){case 1:i+=`

\\section{`;break;case 2:i+=`

\\subsection{`;break;case 3:case 4:case 5:case 6:i+=`

\\subsubsection{`;break}t=`}\\label{${e.attrs?.id}}

`+t,e.attrs?.id&&this.internalLinks.includes(e.attrs.id)&&(t=t+`\\texorpdfstring{\\protect\\hypertarget{${e.attrs.id}}{}}{}`),a=Object.assign({},a),a.noLineBreak=!0,a.onlyFootnoteMarkers||(d=!0,a.onlyFootnoteMarkers=!0,a.unplacedFootnotes=[]);break}case"code_block":{if(e.attrs?.category&&e.attrs.id){let o=this.settings.language||"en-US",u=k(e.attrs.category,o),l={};for(let r of T(this.exporter.doc.content))if(r.type==="code_block"&&r.attrs?.category&&r.attrs.id){let s=r.attrs.category;if(l[s]||(l[s]=0),l[s]++,r.attrs.id===e.attrs.id)break}let c=l[e.attrs.category]||1,n=e.attrs.title?`${u} ${c}: ${this.convertText(e.attrs.title)}`:`${u} ${c}`;i+=`
\\begin{listing}
\\caption{${n}}\\label{${e.attrs.id}}
\\begin{code}

`,t=`

\\end{code}
\\end{listing}
`+t,this.features.listing=!0}else e.attrs?.language?(i+=`
\\begin{code}[${this.convertText(e.attrs.language)}]

`,t=`

\\end{code}
`+t):(i+=`
\\begin{code}

`,t=`

\\end{code}
`+t);this.features.code=!0;break}case"blockquote":i+=`
\\begin{quote}

`,t=`

\\end{quote}
`+t;break;case"ordered_list":{let o=e.attrs?.order??1;o!==1?(i+=`
\\begin{enumerate}[start=${o}]`,this.features.orderedListStart=!0):i+=`
\\begin{enumerate}`,t=`
\\end{enumerate}`+t,a.onlyFootnoteMarkers||(d=!0,a=Object.assign({},a),a.onlyFootnoteMarkers=!0,a.unplacedFootnotes=[]);break}case"bullet_list":i+=`
\\begin{itemize}`,t=`
\\end{itemize}`+t,a.onlyFootnoteMarkers||(d=!0,a=Object.assign({},a),a.onlyFootnoteMarkers=!0,a.unplacedFootnotes=[]);break;case"list_item":i+=`
\\item `,t=`
`+t;break;case"footnote":{let o=e.attrs.footnote;if(a.onlyFootnoteMarkers)i+="\\protect\\footnotemark{}",a.unplacedFootnotes.push(o);else{o.find(l=>l.type==="figure")||(i+="\\footnote{",t="}"+t);let u="";o.forEach(l=>{u+=this.walkJson(l,a)}),h+=u.replace(/^\s+|\s+$/g,"")}break}case"text":{let o,u,l,c,n,r,s,p;if(e.marks&&(o=e.marks.find(f=>f.type==="strong"),u=e.marks.find(f=>f.type==="em"),l=e.marks.find(f=>f.type==="underline"),c=e.marks.find(f=>f.type==="link"),n=e.marks.find(f=>f.type==="anchor"),r=e.marks.find(f=>f.type==="sup"),s=e.marks.find(f=>f.type==="sub"),p=e.marks.find(f=>f.type==="code")),u&&(i+="\\emph{",t="}"+t),o&&(i+="\\textbf{",t="}"+t),l&&(i+="\\underline{",t="}"+t),r&&(i+="\\textsuperscript{",t="}"+t),s&&(i+="\\textsubscript{",t="}"+t),p&&(i+="\\texttt{",t="}"+t),c){let f=c.attrs?.href;f[0]==="#"?i+=`\\hyperlink{${f.slice(1)}}{`:i+=`\\href{${f}}{`,t="}"+t,this.features.hyperlinks=!0}n&&n.attrs?.id&&this.internalLinks.includes(n.attrs.id)&&(i+=`\\hypertarget{${n.attrs.id}}{`,t="}"+t),h+=b(e.text??"");break}case"cross_reference":{h+=`\\hyperref[${e.attrs?.id}]{${e.attrs?.title||"MISSING TARGET"}}`,this.features.hyperlinks=!0;break}case"citation":{let o=e.attrs.references,u=e.attrs.format,l;if(o.length>1&&o.every(c=>!c.locator&&!c.prefix)){let c=[],n="\\"+u;o.map(s=>s.id).every(s=>{let p=this.bibDB.db[s];if(p){if(!p)return!1;if(!this.usedBibDB[s]){let f=this.createUniqueCitationKey(p.entry_key);this.usedBibDB[s]=Object.assign({},p),this.usedBibDB[s].entry_key=f}c.push(this.usedBibDB[s].entry_key)}return!0})?l=n+`{${c.join(",")}}`:l=!1}else{let c="\\"+u;o.length>1&&(c+="s"),l=o.every(r=>{let s=this.bibDB.db[r.id];if(!s)return!1;if(r.prefix&&(c+=`[${r.prefix}]`,r.locator||(c+="[]")),r.locator&&(c+=`[${r.locator}]`),c+="{",!this.usedBibDB[r.id]){let p=this.createUniqueCitationKey(s.entry_key);this.usedBibDB[r.id]=Object.assign({},s),this.usedBibDB[r.id].entry_key=p}return c+=this.usedBibDB[r.id].entry_key,c+="}",!0})?c:!1}l&&(h+=l,this.features.citations=!0);break}case"figure":{let o=e.attrs.category,u=e.attrs.caption?e.content?.find(s=>s.type==="figure_caption")?.content??[]:[],l;if(o!=="none"){this.categoryCounter[o]||(this.categoryCounter[o]=1);let s=this.categoryCounter[o]++,p=`${k(o,this.settings.language??"en-US")} ${s}`;u.length?l=`${p}: ${u.map(f=>this.walkJson(f)).join("")}`:l=p}else l=u.map(s=>this.walkJson(s)).join("");let c="",n,r=e.content?.find(s=>s.type==="image")?.attrs?.image||!1;if(r){this.imageIds.push(r);let s=this.imageDB.db[r],p=F(s,r);n=s.copyright,p.split(".").pop()==="svg"?(c+=`\\includesvg[width=${Number.parseInt(e.attrs.width)/100}\\textwidth]{${p}}
`,this.features.SVGs=!0):(c+=`\\scaledgraphics{${p}}{${Number.parseInt(e.attrs.width)/100}}
`,this.features.images=!0)}else{let s=e.content?.find(p=>p.type==="figure_equation")?.attrs?.equation??"";c+=`\\begin{displaymath}
${s}
\\end{displaymath}
`}if(o==="table"){let s=e.attrs.width==="100"?"left":e.attrs.aligned;s==="center"?(i+=`

\\begin{center}`,t=`

\\end{center}
`+t):s==="right"&&(i+=`

{\\raggedleft`,t=`

}
`+t),i+=`
\\begin{table}
`,h+=l.length?`\\caption*{${l}}`:"",h+=`\\label{${e.attrs?.id}}
${c}`,t=`\\end{table}
`+t}else{if(e.attrs.width==="100"||e.attrs.aligned==="center")i+=`
\\begin{figure}
`,t=`\\end{figure}
`+t;else{let s=e.attrs.aligned[0];i+=`
\\begin{wrapfigure}{${s}}{${Number.parseInt(e.attrs.width)/100}\\textwidth}
`,t=`\\end{wrapfigure}
`+t,this.features.wrapfig=!0}h+=`${c}${l.length?`\\caption*{${l}}`:""}\\label{${e.attrs?.id}}
`}n?.holder&&(h+=`% \xA9 ${n.year?n.year:new Date().getFullYear()} ${n.holder}
`),n?.licenses?.length&&n.licenses.forEach(s=>{h+=`% ${s.title}: ${s.url}${s.start?` (${s.start})
`:""}
`}),e.attrs?.id&&this.internalLinks.includes(e.attrs.id)&&(t=`\\texorpdfstring{\\protect\\hypertarget{${e.attrs.id}}{}}{}
`+t),this.features.captions=!0;break}case"figure_caption":return"";case"figure_equation":break;case"image":break;case"table":if(e.content?.length){let o=e.attrs.category,u=e.attrs.caption?e.content[0].content??[]:[],l;if(o!=="none"){this.categoryCounter[o]||(this.categoryCounter[o]=1);let r=this.categoryCounter[o]++,s=`${k(o,this.settings.language??"en-US")} ${r}`;u.length?l=`${s}: ${u.map(p=>this.walkJson(p)).join("")}`:l=s}else l=u.map(r=>this.walkJson(r)).join("");let c=1;e.content.length>1&&e.content[1].content?.length&&(c=e.content[1].content[0].content.reduce((r,s)=>r+(s.attrs?.colspan||1),0));let n=e.attrs.width==="100"?"left":e.attrs.aligned;n==="center"?(i+=`

\\begin{center}`,t=`

\\end{center}
`+t):n==="right"&&(i+=`

{\\raggedleft`,t=`

}
`),l.length&&(i+=`
\\begin{table}
`,i+=`\\caption*{${l}}\\label{${e.attrs?.id}}`,t=`\\end{table}
`+t,this.features.captions=!0),i+=`

\\begin{tabu} to ${e.attrs.width==="100"?"":Number.parseInt(e.attrs.width)/100}\\textwidth { |${"X|".repeat(c)} }
\\hline

`,t=`\\hline

\\end{tabu}`+t,this.features.tables=!0}break;case"table_body":break;case"table_caption":return"";case"table_row":t+=` \\\\
`;break;case"table_cell":case"table_header":{let o=e.attrs?.colspan??0,u=e.attrs?.rowspan??0;o>1&&(i+=`\\multicolumn{${o}}{c}{`,t+="}"),u>1&&(i+=`\\multirow{${u}}{*}{`,t+="}",this.features.rowspan=!0),t+=" & ";break}case"equation":h+=`$${e.attrs?.equation}$`;break;case"hard_break":a.noLineBreak||(h+=`

`);break;default:break}return e.content&&e.content.forEach(o=>{h+=this.walkJson(o,a)}),d&&a.unplacedFootnotes?.length&&(t+=`\\addtocounter{footnote}{-${a.unplacedFootnotes.length}}`,a.unplacedFootnotes.forEach(o=>{t+=`\\stepcounter{footnote}
`,t+="\\footnotetext{";let u="";o.forEach(l=>{u+=this.walkJson(l,a)}),t+=u.replace(/^\s+|\s+$/g,""),t+="}"}),a.unplacedFootnotes=[]),["table_cell","table_header"].includes(e.type)&&(e.attrs?.rowspan??0)>1&&(h=h.trim().replace(/\n\n/g," \\\\ ")),i+h+t}convertText(e){return e}createUniqueCitationKey(e){return e=e||"key",Object.keys(this.usedBibDB).map(i=>this.usedBibDB[i].entry_key).includes(e)?(e+="X",this.createUniqueCitationKey(e)):e}postProcess(e){return e.replace(/\\end\{code\}\n\n\\begin\{code\}\n\n/g,"").replace(/\\end\{quote\}\n\n\\begin\{quote\}\n\n/g,"").replace(/& {2}\\\\/g,"\\\\").replace(/\n & \n\n/g," & ").replace(/\\item \n\n/g,"\\item ")}assembleEpilogue(){let e="";if(this.features.citations){let a=this.settings.language,i=this.settings.bibliography_header?.[a]||w[a];e+=`

\\printbibliography[title={${b(i)}}]`}return e}assembleCopyright(){let e="",a=this.settings.copyright;return a&&(a.holder&&(e+=`% \xA9 ${a.year?a.year:new Date().getFullYear()} ${a.holder}
`),a.licenses?.length&&a.licenses.forEach(i=>{e+=`% ${i.url}${i.start?` (${i.start})`:""}
`})),e.length&&(e+=`

`),e}assemblePreamble(){let e="";return this.features.subtitle&&(e+=`
                
\\usepackage{titling}
                
\\newcommand{\\subtitle}[1]{%
                    
	\\posttitle{%
                        
		\\par\\end{center}
                        
		\\begin{center}\\large#1\\end{center}
                        
		\\vskip 0.5em}%
                }
            `),this.features.authors&&(e+=`
                
\\usepackage{authblk}
                
\\makeatletter
                
\\let\\@fnsymbol\\@alph
                
\\makeatother
            `),this.features.keywords&&(e+=`
                
\\def\\keywords{\\vspace{.5em}
                
{\\textit{Keywords}:\\,\\relax%
                
}}
                
\\def\\endkeywords{\\par}
                
\\newcommand{\\sep}{, }
            `),this.features.hyperlinks&&(e+=`
\\usepackage{hyperref}`),this.features.captions&&(e+=`
\\usepackage{caption}`),this.features.wrapfig&&(e+=`
\\usepackage{wrapfig}`),this.features.citations&&(e+=`
                
\\usepackage[backend=biber,hyperref=false,citestyle=authoryear,bibstyle=authoryear]{biblatex}
                
\\bibliography{bibliography}
            `),this.features.SVGs&&(e+=`
\\usepackage{svg}`),this.features.images&&(e+=`
\\usepackage{graphicx}`,e+=`
                
\\usepackage{calc}
                
\\newlength{\\imgwidth}
                
\\newcommand\\scaledgraphics[2]{%
                
\\settowidth{\\imgwidth}{\\includegraphics{#1}}%
                
\\setlength{\\imgwidth}{\\minof{\\imgwidth}{#2\\textwidth}}%
                
\\includegraphics[width=\\imgwidth,height=\\textheight,keepaspectratio]{#1}%
                
}
            `),this.features.tables&&(e+=`
\\usepackage{tabu}`),this.features.orderedListStart&&(e+=`
\\usepackage{enumitem}`),this.features.rowspan&&(e+=`
\\usepackage{multirow}`),this.features.code&&(e+=`
            
\\usepackage{xcolor}
            \\definecolor{mygray}{gray}{0.9}
            \\usepackage{fvextra}
            \\usepackage{tcolorbox}
            \\newenvironment{code}%
            {\\VerbatimEnvironment
            \\begin{tcolorbox}[colback=mygray, boxsep=0pt, arc=0pt, boxrule=0pt]
            \\begin{Verbatim}[fontsize=\\scriptsize, commandchars=\\\\\\{\\},
            breaklines, breakafter=*, breaksymbolsep=0.5em,
            breakaftersymbolpre={\\,\\tiny\\ensuremath{\\rfloor}}]}%
            {\\end{Verbatim}%
             \\end{tcolorbox}}
            `),e}};var E=`We strongly recommend using LuaTeX instead of PDFTeX or XeTeX for document
compilation.

In order to compile the LaTeX file, you need to use at least TeXLive 2016. If
there are citations, you additionally need Biber 2.7/BibLaTeX 3.7.

On Ubuntu 18.04+ install these packages:

> sudo apt install texlive-latex-base texlive-bibtex-extra biber texlive-latex-extra

Extract all the files included in this ZIP into a folder.
Run then these commands to create a PDF from within this folder:

> lualatex document

If there are citations, continue with these commands:

> biber document
> lualatex document

Look at the output messages to determine whether you need to run lualatex again.
`;var I=class{constructor(e,a,i,h,t){g(this,"doc");g(this,"docTitle");g(this,"bibDB");g(this,"imageDB");g(this,"updated");g(this,"docContent");g(this,"zipFileName");g(this,"textFiles");g(this,"httpFiles");g(this,"conversion");g(this,"progressCallback");this.doc=e,this.docTitle=$(this.doc.title,this.doc.path||""),this.bibDB=a,this.imageDB=i,this.updated=h,this.progressCallback=t,this.docContent=!1,this.zipFileName=!1,this.textFiles=[],this.httpFiles=[]}init(){this.progressCallback?.(m("Exporting to LaTeX..."),0),this.zipFileName=`${_(this.docTitle)}.latex.zip`,this.docContent=L(C(this.doc.content));let e=new y(this,this.imageDB,this.bibDB,this.doc.settings);if(this.conversion=e.init(this.docContent),this.progressCallback?.(m("Preparing LaTeX files..."),50),Object.keys(this.conversion.usedBibDB).length>0){let a=new B(this.conversion.usedBibDB);this.textFiles.push({filename:"bibliography.bib",contents:a.parse()})}return this.textFiles.push({filename:"document.tex",contents:this.conversion.latex}),this.textFiles.push({filename:"README.txt",contents:E}),this.conversion.imageIds.forEach(a=>{let i=this.imageDB.db[a],h=i.image;if(h instanceof Blob){let t=D(i.file_type,h.type);this.httpFiles.push({filename:`image-${a}.${t}`,url:`blob:${a}`,blob:h})}else this.httpFiles.push({filename:h.split("/").pop(),url:h})}),this.createZip().then(a=>(this.progressCallback?.(m("Export to LaTeX complete."),100),a))}createZip(){return new v(this.textFiles,this.httpFiles,void 0,void 0,this.updated).init().then(a=>this.download(a))}download(e){return(0,j.default)(e,this.zipFileName,"application/zip")}};export{I as LatexExporter};
//# sourceMappingURL=latex-IPLIRZGH.js.map
