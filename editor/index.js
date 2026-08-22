import{a as x,g as L}from"./chunk-BKZJ34WJ.js";import"./chunk-WORZJ6IO.js";import{a as y}from"./chunk-PGDFBYKN.js";import"./chunk-G3NXOJV5.js";import"./chunk-5IOMIBRT.js";import"./chunk-NPYTCIQW.js";import"./chunk-V5IEHUAE.js";import"./chunk-DJTNZFGX.js";import"./chunk-OURL3F7J.js";import{a as $}from"./chunk-YN3TLLDT.js";import"./chunk-X2FKDYHU.js";import"./chunk-C2QYBICR.js";import"./chunk-VZQ4L4QX.js";import"./chunk-6KADXLX4.js";import"./chunk-YSGRW6J7.js";import"./chunk-DHIDMBDV.js";import"./chunk-MF6NR3QC.js";import"./chunk-ADOOI6TI.js";import"./chunk-LOE3AZ6M.js";import{f as t}from"./chunk-LUSWO74V.js";import"./chunk-GADWB3Y5.js";function M(){return window.location.pathname.replace(/\/(?:editor\/(?:index\.html)?|index\.html)$/,"/")}function R(o){return`${M()}static/${o}`}var _=y.documentStyles.map(o=>({title:o.title,slug:o.slug,contents:o.contents,documentstylefile_set:o.files.map(n=>[R(`style-files/${n}`),n])})),F=y.exportTemplates.map(o=>({title:o.title,file_type:o.file_type,template_file:R(`export-templates/${o.file}`)})),P={[y.documentTemplate.importId]:{title:y.documentTemplate.title}};async function m(o){return $({...o,appName:"fiduswriter-editor-demo",documentStyles:_,exportTemplates:F,documentTemplates:P,routes:{"":{app:"document"},document:{app:"document"}}})}m.documentStyles=_;m.exportTemplates=F;m.documentTemplates=P;var N=[{code:"en",name:"English"},{code:"ar",name:"\u0627\u0644\u0639\u0631\u0628\u064A\u0629"},{code:"bg",name:"\u0411\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438"},{code:"cs",name:"\u010Ce\u0161tina"},{code:"da",name:"Dansk"},{code:"de",name:"Deutsch"},{code:"en_US",name:"English (US)"},{code:"es",name:"Espa\xF1ol"},{code:"fr",name:"Fran\xE7ais"},{code:"it",name:"Italiano"},{code:"ja",name:"\u65E5\u672C\u8A9E"},{code:"ko",name:"\uD55C\uAD6D\uC5B4"},{code:"nb",name:"Norsk bokm\xE5l"},{code:"nl",name:"Nederlands"},{code:"pl",name:"Polski"},{code:"pt_BR",name:"Portugu\xEAs (Brasil)"},{code:"pt_PT",name:"Portugu\xEAs (Portugal)"},{code:"ru",name:"\u0420\u0443\u0441\u0441\u043A\u0438\u0439"},{code:"sv",name:"Svenska"},{code:"tr",name:"T\xFCrk\xE7e"},{code:"zh_Hans",name:"\u7B80\u4F53\u4E2D\u6587"}];function B(){return new Promise(o=>{let n=document.createElement("div");n.className="demo-startup-overlay",n.innerHTML=`
            <div class="demo-startup-dialog">
                <h1>${t("Fidus Writer Editor")}</h1>
                <p>${t("Open or create a document to start editing.")}</p>

                <label for="demo-username">${t("Username (optional)")}</label>
                <input type="text" id="demo-username" class="fw-input" placeholder="${t("Demo User")}" />

                <label for="demo-userid">${t("User id (optional)")}</label>
                <input type="number" id="demo-userid" class="fw-input" value="1" min="1" />

                <label for="demo-locale">${t("Language")}</label>
                <select id="demo-locale" class="fw-input"></select>

                <div class="demo-section">
                    <h2>${t("Editing preferences")}</h2>
                    <label class="checkable-label">
                        <input type="checkbox" id="demo-inline-references" />
                        ${t("Enable inline reference typing (@)")}
                    </label>
                    <label class="checkable-label">
                        <input type="checkbox" id="demo-inline-math" />
                        ${t("Enable inline math typing ($)")}
                    </label>
                </div>

                <div class="demo-section">
                    <h2>${t("Import existing document")}</h2>
                    <p>${t("Drop a file here or click to select.")}</p>
                    <div id="demo-import-dropzone" class="demo-dropzone">
                        ${t("Supported: .fidus, .docx, .odt, .json")}
                    </div>
                    <input type="file" id="demo-import-input" accept=".fidus,.docx,.odt,.json" hidden />
                </div>

                <div class="demo-section">
                    <h2>${t("Start new document")}</h2>
                    <button id="demo-new-doc" class="fw-button fw-dark" type="button">
                        ${t("Start new document")}
                    </button>
                </div>

                <div class="demo-section">
                    <h2>${t("Try a sample document")}</h2>
                    <button id="demo-load-sample" class="fw-button fw-light" type="button">
                        ${t("Load sample document")}
                    </button>
                </div>

                <div class="demo-section">
                    <h2>${t("Apply document template")}</h2>
                    <p>${t("Optional: select a .fidustemplate file to use with a new document.")}</p>
                    <input type="file" id="demo-template-input" accept=".fidustemplate" />
                </div>
            </div>
        `;let r=n.querySelector("#demo-locale");N.forEach(e=>{let s=document.createElement("option");s.value=e.code,s.textContent=e.name,r.appendChild(s)}),r.value="en";let a=n.querySelector("#demo-import-dropzone"),i=n.querySelector("#demo-import-input"),f=n.querySelector("#demo-template-input"),p=n.querySelector("#demo-new-doc"),E=n.querySelector("#demo-load-sample"),S=n.querySelector("#demo-username"),k=n.querySelector("#demo-userid"),I=n.querySelector("#demo-inline-references"),T=n.querySelector("#demo-inline-math"),v=()=>({inline_references:I.checked,inline_math:T.checked}),d=()=>{let e=parseInt(k.value,10);return Number.isFinite(e)&&e>0?e:1},g=()=>n.remove(),w=async()=>{try{let e=await fetch("../static/demo.fidus");if(!e.ok)throw new Error(`HTTP ${e.status}`);let s=await e.blob(),l=new File([s],"demo.fidus",{type:"application/vnd.fiduswriter+zip"});c(l)}catch(e){console.error("Failed to load sample document:",e),window.alert(t("Could not load the sample document."))}},h=()=>S.value.trim()||t("Demo User"),c=e=>{g(),o({locale:r.value,username:h(),userId:d(),preferences:v(),result:{mode:"import",file:e}})},D=()=>{let e=f.files?.[0];g(),o({locale:r.value,username:h(),userId:d(),preferences:v(),result:{mode:"new",templateFile:e}})};a.addEventListener("click",()=>i.click()),a.addEventListener("dragover",e=>{e.preventDefault(),a.classList.add("dragover")}),a.addEventListener("dragleave",()=>a.classList.remove("dragover")),a.addEventListener("drop",e=>{e.preventDefault(),a.classList.remove("dragover");let s=e.dataTransfer?.files[0];s&&c(s)}),i.addEventListener("change",()=>{let e=i.files?.[0];e&&c(e)}),p.addEventListener("click",D),E.addEventListener("click",w),document.body.appendChild(n)})}async function A(){console.log("Demo main starting");let r=new URLSearchParams(window.location.search).get("autostart")==="1"?{locale:"en",username:"Demo User",userId:1,preferences:{},result:{mode:"new"}}:await B(),a=r.locale,i=r.username,f=r.userId,p=r.result,E=await import("./document-helpers-USTRZMAT.js"),{applyTemplate:S,createDefaultDocument:k,createEmptyBibDB:I,createEmptyImageDB:T,importDocument:v}=E,d,g=1,w="",h,c,D;if(p.mode==="import"){let u={id:f,username:i,emails:[{address:"demo@example.com",primary:!0}],name:i,is_authenticated:!0},{doc:b,bibliography:H,images:U,comments:q}=await v(p.file,u,a);d=b.content,g=b.id||1,w=b.path||w,h=H,c=U,D=q}else p.templateFile?d=(await S(p.templateFile)).content:d=k();let e=async()=>({doc:{v:0,content:d,comments:D??{},bibliography:h??I().db,images:c??T().db},doc_info:{id:g,rights:"write",is_owner:!0,path:w,updated:new Date,dir:"ltr",access_rights:"write",e2ee:!1,owner:{id:f,name:i,type:"user",contacts:[]}},time:Date.now()}),s=c?Object.fromEntries(Object.entries(c).map(([u,b])=>[Number(u),b])):void 0,l=await L({locale:a,username:i,userId:f,userPreferences:r.preferences,documentData:e,initialImages:s,getDocContent:()=>d,documentStyles:m.documentStyles,exportTemplates:m.exportTemplates,documentTemplates:m.documentTemplates,plugins:[]});function C(){let u=l.getDoc({use_current_view:!0});new x(l.app,u,l.mod.db.bibDB,l.mod.db.imageDB,!1)}window.downloadDocument=C,window.startDemoEditor=A,window.demoEditor=l}A().catch(o=>{console.error("Demo failed to start:",o),document.body.innerHTML=`<pre style="padding:20px;color:red">${String(o)}</pre>`});
//# sourceMappingURL=index.js.map
