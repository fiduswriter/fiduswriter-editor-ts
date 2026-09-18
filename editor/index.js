import{a as E}from"./chunk-ZSRQLWQV.js";import{a as $,g as T}from"./chunk-GVI5F5YW.js";import"./chunk-PB5I5P3M.js";import"./chunk-JC6MYD7Q.js";import"./chunk-55WTS4CB.js";import"./chunk-5IOMIBRT.js";import"./chunk-TVDMBYWA.js";import"./chunk-M3IPOU2D.js";import"./chunk-NPYTCIQW.js";import"./chunk-CRCJELCR.js";import"./chunk-NHVGFFBN.js";import"./chunk-P2C3URTC.js";import"./chunk-OGIBSBHU.js";import"./chunk-VZQ4L4QX.js";import"./chunk-6KADXLX4.js";import"./chunk-YSGRW6J7.js";import"./chunk-DHIDMBDV.js";import"./chunk-MF6NR3QC.js";import"./chunk-P2EULMDR.js";import"./chunk-YK27WWCV.js";import{f as t}from"./chunk-LUSWO74V.js";import"./chunk-GADWB3Y5.js";var C=[{code:"en",name:"English"},{code:"ar",name:"\u0627\u0644\u0639\u0631\u0628\u064A\u0629"},{code:"bg",name:"\u0411\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438"},{code:"cs",name:"\u010Ce\u0161tina"},{code:"da",name:"Dansk"},{code:"de",name:"Deutsch"},{code:"en_US",name:"English (US)"},{code:"es",name:"Espa\xF1ol"},{code:"fr",name:"Fran\xE7ais"},{code:"it",name:"Italiano"},{code:"ja",name:"\u65E5\u672C\u8A9E"},{code:"ko",name:"\uD55C\uAD6D\uC5B4"},{code:"nb",name:"Norsk bokm\xE5l"},{code:"nl",name:"Nederlands"},{code:"pl",name:"Polski"},{code:"pt_BR",name:"Portugu\xEAs (Brasil)"},{code:"pt_PT",name:"Portugu\xEAs (Portugal)"},{code:"ru",name:"\u0420\u0443\u0441\u0441\u043A\u0438\u0439"},{code:"sv",name:"Svenska"},{code:"tr",name:"T\xFCrk\xE7e"},{code:"zh_Hans",name:"\u7B80\u4F53\u4E2D\u6587"}];function x(){return new Promise(r=>{let n=document.createElement("div");n.className="demo-startup-overlay",n.innerHTML=`
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
        `;let d=n.querySelector("#demo-locale");C.forEach(e=>{let a=document.createElement("option");a.value=e.code,a.textContent=e.name,d.appendChild(a)}),d.value="en";let o=n.querySelector("#demo-import-dropzone"),c=n.querySelector("#demo-import-input"),l=n.querySelector("#demo-template-input"),g=n.querySelector("#demo-new-doc"),m=n.querySelector("#demo-load-sample"),D=n.querySelector("#demo-username"),k=n.querySelector("#demo-userid"),S=n.querySelector("#demo-inline-references"),I=n.querySelector("#demo-inline-math"),b=()=>({inline_references:S.checked,inline_math:I.checked}),v=()=>{let e=parseInt(k.value,10);return Number.isFinite(e)&&e>0?e:1},s=()=>n.remove(),y=async()=>{try{let e=await fetch("../static/demo.fidus");if(!e.ok)throw new Error(`HTTP ${e.status}`);let a=await e.blob(),L=new File([a],"demo.fidus",{type:"application/vnd.fiduswriter+zip"});p(L)}catch(e){console.error("Failed to load sample document:",e),window.alert(t("Could not load the sample document."))}},u=()=>D.value.trim()||t("Demo User"),p=e=>{s(),r({locale:d.value,username:u(),userId:v(),preferences:b(),result:{mode:"import",file:e}})},f=()=>{let e=l.files?.[0];s(),r({locale:d.value,username:u(),userId:v(),preferences:b(),result:{mode:"new",templateFile:e}})};o.addEventListener("click",()=>c.click()),o.addEventListener("dragover",e=>{e.preventDefault(),o.classList.add("dragover")}),o.addEventListener("dragleave",()=>o.classList.remove("dragover")),o.addEventListener("drop",e=>{e.preventDefault(),o.classList.remove("dragover");let a=e.dataTransfer?.files[0];a&&p(a)}),c.addEventListener("change",()=>{let e=c.files?.[0];e&&p(e)}),g.addEventListener("click",f),m.addEventListener("click",y),document.body.appendChild(n)})}async function F(){console.log("Demo main starting");let r=new URLSearchParams(window.location.search),n=r.get("autostart")==="1",d=r.get("title-editing")==="1",o=n?{locale:"en",username:"Demo User",userId:1,preferences:{},result:{mode:"new"}}:await x(),c=o.locale,l=o.username,g=o.userId,m=o.result,D=await import("./document-helpers-HYD7S7YQ.js"),{applyTemplate:k,createDefaultDocument:S,createEmptyBibDB:I,createEmptyImageDB:b,importDocument:v}=D,s,y=1,u="",p,f,e;if(m.mode==="import"){let i={id:g,username:l,emails:[{address:"demo@example.com",primary:!0}],name:l,is_authenticated:!0},{doc:h,bibliography:B,images:H,comments:_}=await v(m.file,i,c);s=h.content,y=h.id||1,u=h.path||u,p=B,f=H,e=_}else m.templateFile?s=(await k(m.templateFile)).content:s=S();let a=async()=>({doc:{v:0,content:s,comments:e??{},bibliography:p??I().db,images:f??b().db},doc_info:{id:y,rights:"write",is_owner:!0,path:u,updated:new Date,dir:"ltr",access_rights:"write",e2ee:!1,owner:{id:g,name:l,type:"user",contacts:[]}},time:Date.now()}),L=f?Object.fromEntries(Object.entries(f).map(([i,h])=>[Number(i),h])):void 0,R=[];window.titleChanges=R;let w=await T({locale:c,username:l,userId:g,userPreferences:o.preferences,documentData:a,initialImages:L,getDocContent:()=>s,documentStyles:E.documentStyles,exportTemplates:E.exportTemplates,documentTemplates:E.documentTemplates,plugins:[],...d?{pathEditable:!0,onPathChange:i=>{R.push(i)}}:{}});function P(){let i=w.getDoc({use_current_view:!0});new $(w.app,i,w.mod.db.bibDB,w.mod.db.imageDB,!1)}window.downloadDocument=P,window.startDemoEditor=F,window.demoEditor=w}F().catch(r=>{console.error("Demo failed to start:",r),document.body.innerHTML=`<pre style="padding:20px;color:red">${String(r)}</pre>`});
//# sourceMappingURL=index.js.map
