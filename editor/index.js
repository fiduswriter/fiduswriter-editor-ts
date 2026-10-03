import{a as E}from"./chunk-EMEUUKLA.js";import{a as R,g as T}from"./chunk-UQUIPSUY.js";import"./chunk-OV3ZSREZ.js";import"./chunk-BZ4DZUT4.js";import"./chunk-7DTT6KAR.js";import"./chunk-5IOMIBRT.js";import"./chunk-USSBEZRB.js";import"./chunk-NPYTCIQW.js";import"./chunk-HC7DUIXN.js";import"./chunk-CRCJELCR.js";import"./chunk-FSETP77I.js";import"./chunk-DGHUN74V.js";import"./chunk-JUO5EG4H.js";import"./chunk-VZQ4L4QX.js";import"./chunk-6KADXLX4.js";import"./chunk-YSGRW6J7.js";import"./chunk-DHIDMBDV.js";import"./chunk-MF6NR3QC.js";import"./chunk-COU53FUL.js";import"./chunk-WZMV5NJM.js";import"./chunk-4ZJAXHY2.js";import{f as t}from"./chunk-LUSWO74V.js";import"./chunk-GADWB3Y5.js";var C=[{code:"en",name:"English"},{code:"ar",name:"\u0627\u0644\u0639\u0631\u0628\u064A\u0629"},{code:"bg",name:"\u0411\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438"},{code:"cs",name:"\u010Ce\u0161tina"},{code:"da",name:"Dansk"},{code:"de",name:"Deutsch"},{code:"en_US",name:"English (US)"},{code:"es",name:"Espa\xF1ol"},{code:"fr",name:"Fran\xE7ais"},{code:"it",name:"Italiano"},{code:"ja",name:"\u65E5\u672C\u8A9E"},{code:"ko",name:"\uD55C\uAD6D\uC5B4"},{code:"nb",name:"Norsk bokm\xE5l"},{code:"nl",name:"Nederlands"},{code:"pl",name:"Polski"},{code:"pt_BR",name:"Portugu\xEAs (Brasil)"},{code:"pt_PT",name:"Portugu\xEAs (Portugal)"},{code:"ru",name:"\u0420\u0443\u0441\u0441\u043A\u0438\u0439"},{code:"sv",name:"Svenska"},{code:"tr",name:"T\xFCrk\xE7e"},{code:"zh_Hans",name:"\u7B80\u4F53\u4E2D\u6587"}];function x(){return new Promise(r=>{let n=document.createElement("div");n.className="demo-startup-overlay",n.innerHTML=`
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
                    <label class="checkable-label">
                        <input type="checkbox" id="demo-grammar-check" />
                        ${t("Enable continuous spell/grammar checking")}
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
        `;let d=n.querySelector("#demo-locale");C.forEach(e=>{let a=document.createElement("option");a.value=e.code,a.textContent=e.name,d.appendChild(a)}),d.value="en";let o=n.querySelector("#demo-import-dropzone"),l=n.querySelector("#demo-import-input"),m=n.querySelector("#demo-template-input"),p=n.querySelector("#demo-new-doc"),u=n.querySelector("#demo-load-sample"),D=n.querySelector("#demo-username"),S=n.querySelector("#demo-userid"),I=n.querySelector("#demo-inline-references"),L=n.querySelector("#demo-inline-math"),$=n.querySelector("#demo-grammar-check"),v=()=>({inline_references:I.checked,inline_math:L.checked,grammar_check_continuous:$.checked}),s=()=>{let e=parseInt(S.value,10);return Number.isFinite(e)&&e>0?e:1},g=()=>n.remove(),f=async()=>{try{let e=await fetch("../static/demo.fidus");if(!e.ok)throw new Error(`HTTP ${e.status}`);let a=await e.blob(),k=new File([a],"demo.fidus",{type:"application/vnd.fiduswriter+zip"});i(k)}catch(e){console.error("Failed to load sample document:",e),window.alert(t("Could not load the sample document."))}},h=()=>D.value.trim()||t("Demo User"),i=e=>{g(),r({locale:d.value,username:h(),userId:s(),preferences:v(),result:{mode:"import",file:e}})},y=()=>{let e=m.files?.[0];g(),r({locale:d.value,username:h(),userId:s(),preferences:v(),result:{mode:"new",templateFile:e}})};o.addEventListener("click",()=>l.click()),o.addEventListener("dragover",e=>{e.preventDefault(),o.classList.add("dragover")}),o.addEventListener("dragleave",()=>o.classList.remove("dragover")),o.addEventListener("drop",e=>{e.preventDefault(),o.classList.remove("dragover");let a=e.dataTransfer?.files[0];a&&i(a)}),l.addEventListener("change",()=>{let e=l.files?.[0];e&&i(e)}),p.addEventListener("click",y),u.addEventListener("click",f),document.body.appendChild(n)})}async function F(){console.log("Demo main starting");let r=new URLSearchParams(window.location.search),n=r.get("autostart")==="1",d=r.get("title-editing")==="1",o=n?{locale:"en",username:"Demo User",userId:1,preferences:{},result:{mode:"new"}}:await x(),l=o.locale,m=o.username,p=o.userId,u=o.result,D=await import("./document-helpers-SHKXRQZW.js"),{applyTemplate:S,createDefaultDocument:I,createEmptyBibDB:L,createEmptyImageDB:$,importDocument:v}=D,s,g=1,f="",h,i,y;if(u.mode==="import"){let c={id:p,username:m,emails:[{address:"demo@example.com",primary:!0}],name:m,is_authenticated:!0},{doc:b,bibliography:_,images:H,comments:B}=await v(u.file,c,l);s=b.content,g=b.id||1,f=b.path||f,h=_,i=H,y=B}else u.templateFile?s=(await S(u.templateFile)).content:s=I();let e=async()=>({doc:{v:0,content:s,comments:y??{},bibliography:h??L().db,images:i??$().db},doc_info:{id:g,rights:"write",is_owner:!0,path:f,updated:new Date,dir:"ltr",access_rights:"write",e2ee:!1,owner:{id:p,name:m,type:"user",contacts:[]}},time:Date.now()}),a=i?Object.fromEntries(Object.entries(i).map(([c,b])=>[Number(c),b])):void 0,k=[];window.titleChanges=k;let w=await T({locale:l,username:m,userId:p,userPreferences:o.preferences,documentData:e,initialImages:a,getDocContent:()=>s,documentStyles:E.documentStyles,exportTemplates:E.exportTemplates,documentTemplates:E.documentTemplates,plugins:[],...d?{pathEditable:!0,onPathChange:c=>{k.push(c)}}:{}});function P(){let c=w.getDoc({use_current_view:!0});new R(w.app,c,w.mod.db.bibDB,w.mod.db.imageDB,!1)}window.downloadDocument=P,window.startDemoEditor=F,window.demoEditor=w}F().catch(r=>{console.error("Demo failed to start:",r),document.body.innerHTML=`<pre style="padding:20px;color:red">${String(r)}</pre>`});
//# sourceMappingURL=index.js.map
