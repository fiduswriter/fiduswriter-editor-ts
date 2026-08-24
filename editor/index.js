import{a as y}from"./chunk-M5JXYUQP.js";import{a as L,g as $}from"./chunk-MB2MCJG2.js";import"./chunk-WL5KVMEW.js";import"./chunk-JC6MYD7Q.js";import"./chunk-RVN4ONU6.js";import"./chunk-5IOMIBRT.js";import"./chunk-V5IEHUAE.js";import"./chunk-VM3RMUGW.js";import"./chunk-NPYTCIQW.js";import"./chunk-OURL3F7J.js";import"./chunk-GBETS7DQ.js";import"./chunk-UDA3CHOA.js";import"./chunk-E4F6I377.js";import"./chunk-VZQ4L4QX.js";import"./chunk-6KADXLX4.js";import"./chunk-YSGRW6J7.js";import"./chunk-DHIDMBDV.js";import"./chunk-MF6NR3QC.js";import"./chunk-ADOOI6TI.js";import"./chunk-LL2EWV7X.js";import{f as t}from"./chunk-LUSWO74V.js";import"./chunk-GADWB3Y5.js";var H=[{code:"en",name:"English"},{code:"ar",name:"\u0627\u0644\u0639\u0631\u0628\u064A\u0629"},{code:"bg",name:"\u0411\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438"},{code:"cs",name:"\u010Ce\u0161tina"},{code:"da",name:"Dansk"},{code:"de",name:"Deutsch"},{code:"en_US",name:"English (US)"},{code:"es",name:"Espa\xF1ol"},{code:"fr",name:"Fran\xE7ais"},{code:"it",name:"Italiano"},{code:"ja",name:"\u65E5\u672C\u8A9E"},{code:"ko",name:"\uD55C\uAD6D\uC5B4"},{code:"nb",name:"Norsk bokm\xE5l"},{code:"nl",name:"Nederlands"},{code:"pl",name:"Polski"},{code:"pt_BR",name:"Portugu\xEAs (Brasil)"},{code:"pt_PT",name:"Portugu\xEAs (Portugal)"},{code:"ru",name:"\u0420\u0443\u0441\u0441\u043A\u0438\u0439"},{code:"sv",name:"Svenska"},{code:"tr",name:"T\xFCrk\xE7e"},{code:"zh_Hans",name:"\u7B80\u4F53\u4E2D\u6587"}];function R(){return new Promise(l=>{let n=document.createElement("div");n.className="demo-startup-overlay",n.innerHTML=`
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
        `;let o=n.querySelector("#demo-locale");H.forEach(e=>{let r=document.createElement("option");r.value=e.code,r.textContent=e.name,o.appendChild(r)}),o.value="en";let a=n.querySelector("#demo-import-dropzone"),s=n.querySelector("#demo-import-input"),p=n.querySelector("#demo-template-input"),m=n.querySelector("#demo-new-doc"),D=n.querySelector("#demo-load-sample"),E=n.querySelector("#demo-username"),k=n.querySelector("#demo-userid"),S=n.querySelector("#demo-inline-references"),I=n.querySelector("#demo-inline-math"),h=()=>({inline_references:S.checked,inline_math:I.checked}),i=()=>{let e=parseInt(k.value,10);return Number.isFinite(e)&&e>0?e:1},f=()=>n.remove(),w=async()=>{try{let e=await fetch("../static/demo.fidus");if(!e.ok)throw new Error(`HTTP ${e.status}`);let r=await e.blob(),c=new File([r],"demo.fidus",{type:"application/vnd.fiduswriter+zip"});d(c)}catch(e){console.error("Failed to load sample document:",e),window.alert(t("Could not load the sample document."))}},g=()=>E.value.trim()||t("Demo User"),d=e=>{f(),l({locale:o.value,username:g(),userId:i(),preferences:h(),result:{mode:"import",file:e}})},v=()=>{let e=p.files?.[0];f(),l({locale:o.value,username:g(),userId:i(),preferences:h(),result:{mode:"new",templateFile:e}})};a.addEventListener("click",()=>s.click()),a.addEventListener("dragover",e=>{e.preventDefault(),a.classList.add("dragover")}),a.addEventListener("dragleave",()=>a.classList.remove("dragover")),a.addEventListener("drop",e=>{e.preventDefault(),a.classList.remove("dragover");let r=e.dataTransfer?.files[0];r&&d(r)}),s.addEventListener("change",()=>{let e=s.files?.[0];e&&d(e)}),m.addEventListener("click",v),D.addEventListener("click",w),document.body.appendChild(n)})}async function T(){console.log("Demo main starting");let o=new URLSearchParams(window.location.search).get("autostart")==="1"?{locale:"en",username:"Demo User",userId:1,preferences:{},result:{mode:"new"}}:await R(),a=o.locale,s=o.username,p=o.userId,m=o.result,D=await import("./document-helpers-JFJAZ6OI.js"),{applyTemplate:E,createDefaultDocument:k,createEmptyBibDB:S,createEmptyImageDB:I,importDocument:h}=D,i,f=1,w="",g,d,v;if(m.mode==="import"){let u={id:p,username:s,emails:[{address:"demo@example.com",primary:!0}],name:s,is_authenticated:!0},{doc:b,bibliography:F,images:P,comments:B}=await h(m.file,u,a);i=b.content,f=b.id||1,w=b.path||w,g=F,d=P,v=B}else m.templateFile?i=(await E(m.templateFile)).content:i=k();let e=async()=>({doc:{v:0,content:i,comments:v??{},bibliography:g??S().db,images:d??I().db},doc_info:{id:f,rights:"write",is_owner:!0,path:w,updated:new Date,dir:"ltr",access_rights:"write",e2ee:!1,owner:{id:p,name:s,type:"user",contacts:[]}},time:Date.now()}),r=d?Object.fromEntries(Object.entries(d).map(([u,b])=>[Number(u),b])):void 0,c=await $({locale:a,username:s,userId:p,userPreferences:o.preferences,documentData:e,initialImages:r,getDocContent:()=>i,documentStyles:y.documentStyles,exportTemplates:y.exportTemplates,documentTemplates:y.documentTemplates,plugins:[]});function x(){let u=c.getDoc({use_current_view:!0});new L(c.app,u,c.mod.db.bibDB,c.mod.db.imageDB,!1)}window.downloadDocument=x,window.startDemoEditor=T,window.demoEditor=c}T().catch(l=>{console.error("Demo failed to start:",l),document.body.innerHTML=`<pre style="padding:20px;color:red">${String(l)}</pre>`});
//# sourceMappingURL=index.js.map
