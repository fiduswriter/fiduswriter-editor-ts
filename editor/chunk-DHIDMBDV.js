import{k as m,u as v}from"./chunk-LUSWO74V.js";function B(i){return!i||i.length<5?{valid:!1,message:gettext("Password must be at least 5 characters long.")}:{valid:!0,message:""}}function I(i){if(!i)return 0;let n=0;i.length>=12&&n++,i.length>=16&&n++,i.length>=20&&n++;let d=/[a-z]/.test(i),c=/[A-Z]/.test(i),l=/[0-9]/.test(i),p=/[^a-zA-Z0-9]/.test(i);[d,c,l,p].filter(Boolean).length>=3&&n++;let r=[/^123456/,/^123123/,/^password/i,/^qwerty/i,/^abc123/i,/(.)\1{3,}/];for(let s of r)if(s.test(i)){n=Math.max(0,n-2);break}return Math.min(4,Math.max(0,n))}function k(i){let n=[{cssClass:"very-weak",label:gettext("Very weak")},{cssClass:"weak",label:gettext("Weak")},{cssClass:"fair",label:gettext("Fair")},{cssClass:"strong",label:gettext("Strong")},{cssClass:"very-strong",label:gettext("Very strong")}];return n[i]||n[0]}function D(i,n="",d=null){return new Promise(c=>{let l="e2ee-enter-password";if(n&&n.length>0){i(n),c();return}let p=`
            <div class="e2ee-password-dialog">
                <p>${gettext("This document is end-to-end encrypted. Enter the password to decrypt it.")}</p>
                <div class="e2ee-password-field">
                    <label for="e2ee-password-input">${gettext("Password")}</label>
                    <input type="password" id="e2ee-password-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" autofocus />
                    <button type="button" class="e2ee-toggle-visibility" title="${gettext("Show password")}">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
                <div class="e2ee-password-error" id="e2ee-password-error"></div>
            </div>
        `,u,r=[{text:gettext("Decrypt"),classes:"fw-button fw-dark",click:()=>{let o=document.getElementById("e2ee-password-input"),e=o?o.value:"";if(e.length===0){let t=document.getElementById("e2ee-password-error");t&&(t.textContent=gettext("Please enter the password."));return}u.close(),i(e),c()}},{text:gettext("Cancel"),classes:"fw-button fw-light",click:()=>{u.close(),typeof d=="function"&&d(),c()}}],s={title:gettext("Encrypted Document"),id:l,body:p,buttons:r,canClose:!0};u=new m(s),u.open(),setTimeout(()=>{let o=document.querySelector(`#${l} .e2ee-toggle-visibility`),e=document.getElementById("e2ee-password-input");if(o&&e){let t=o;t.addEventListener("click",()=>{let a=e;a.type==="password"?(a.type="text",t.innerHTML='<i class="fa-solid fa-eye-slash"></i>',t.title=gettext("Hide password")):(a.type="password",t.innerHTML='<i class="fa-solid fa-eye"></i>',t.title=gettext("Show password"))})}e&&(e.addEventListener("keypress",t=>{t.key==="Enter"&&(t.preventDefault(),r[0].click?.())}),e.focus())},100)})}function M(i){return new Promise(n=>{let d="e2ee-create-password",c=`
            <div class="e2ee-password-dialog">
                <p>${gettext("Set a password to encrypt this document. You will need this password to open the document in the future.")}</p>
                <p class="e2ee-password-hint">${gettext('Tip: Use a passphrase with multiple words, e.g. "correct-horse-battery-staple". This is both secure and easy to remember.')}</p>
                <div class="e2ee-password-field">
                    <label for="e2ee-new-password-input">${gettext("Password")}</label>
                    <input type="password" id="e2ee-new-password-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" autofocus />
                    <button type="button" class="e2ee-toggle-visibility" title="${gettext("Show password")}">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
                <div class="e2ee-strength-meter">
                    <div class="e2ee-strength-bar" id="e2ee-strength-bar"></div>
                    <span class="e2ee-strength-label" id="e2ee-strength-label"></span>
                </div>
                <div class="e2ee-password-field">
                    <label for="e2ee-confirm-password-input">${gettext("Confirm password")}</label>
                    <input type="password" id="e2ee-confirm-password-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" />
                </div>
                <div class="e2ee-password-error" id="e2ee-password-error"></div>
            </div>
        `,l,p=[{text:gettext("Create Encrypted Document"),classes:"fw-button fw-dark",click:()=>{let r=document.getElementById("e2ee-new-password-input"),s=document.getElementById("e2ee-confirm-password-input"),o=document.getElementById("e2ee-password-error"),e=r?r.value:"",t=s?s.value:"",a=B(e);if(!a.valid){o&&(o.textContent=a.message);return}if(e!==t){o&&(o.textContent=gettext("Passwords do not match."));return}l.close(),i(e),n()}}],u={title:gettext("Set Document Password"),id:d,body:c,buttons:p,canClose:!0};l=new m(u),l.open(),setTimeout(()=>{document.querySelectorAll(`#${d} .e2ee-toggle-visibility`).forEach(e=>{e.addEventListener("click",()=>{let t=e.parentElement?.querySelector("input");if(t){let a=t;a.type==="password"?(a.type="text",e.innerHTML='<i class="fa-solid fa-eye-slash"></i>'):(a.type="password",e.innerHTML='<i class="fa-solid fa-eye"></i>')}})});let s=document.getElementById("e2ee-new-password-input");s&&(s.addEventListener("input",()=>{let e=I(s.value),t=k(e),a=document.getElementById("e2ee-strength-bar"),g=document.getElementById("e2ee-strength-label");a&&(a.className=`e2ee-strength-bar ${t.cssClass}`,a.style.width=`${(e+1)*25}%`),g&&(g.textContent=t.label,g.className=`e2ee-strength-label ${t.cssClass}`)}),s.dispatchEvent(new Event("input")),s.focus());let o=document.getElementById("e2ee-confirm-password-input");o&&o.addEventListener("keypress",e=>{e.key==="Enter"&&(e.preventDefault(),p[0].click?.())})},100)})}function H(i,n={}){return new Promise(d=>{let c="e2ee-change-password",l=n.currentPassword||"",p=n.suggestedNewPassword||"",u=p.length>0,r=n.hideCurrentPassword||!1,s=n.showNewPasswordPlaintext||!1,o=n.infoText||"",e=r?`<input type="hidden" id="e2ee-current-password-input" value="${v(l)}" />`:`<div class="e2ee-password-field">
                    <label for="e2ee-current-password-input">${gettext("Current password")}</label>
                    <input type="password" id="e2ee-current-password-input" class="e2ee-password-input"
                           value="${v(l)}"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" autofocus />
                </div>
                <hr />`,t=s?"text":"password",a=`
            <div class="e2ee-password-dialog">
                <p>${gettext("Change the document password. After changing, you must share the new password with all collaborators.")}</p>
                ${o?`<p class="e2ee-password-hint">${o}</p>`:""}
                ${e}
                <div class="e2ee-password-field">
                    <label for="e2ee-new-password-input">${gettext("New password")}</label>
                    <input type="${t}" id="e2ee-new-password-input" class="e2ee-password-input"
                           value="${v(p)}"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" ${r?"autofocus":""} />
                    ${s?"":`<button type="button" class="e2ee-toggle-visibility" title="${gettext("Show password")}">
                               <i class="fa-solid fa-eye"></i>
                           </button>`}
                </div>
                <div class="e2ee-strength-meter" style="display: ${s&&u?"none":""}">
                    <div class="e2ee-strength-bar" id="e2ee-strength-bar"></div>
                    <span class="e2ee-strength-label" id="e2ee-strength-label"></span>
                </div>
                <div class="e2ee-password-field" id="e2ee-confirm-field" style="display: ${u?"none":""}">
                    <label for="e2ee-confirm-password-input">${gettext("Confirm new password")}</label>
                    <input type="password" id="e2ee-confirm-password-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" />
                </div>
                <div class="e2ee-password-error" id="e2ee-password-error"></div>
            </div>
        `,g=!u,$,P=[{text:gettext("Change Password"),classes:"fw-button fw-dark",click:async()=>{let y=document.getElementById("e2ee-current-password-input"),x=document.getElementById("e2ee-new-password-input"),E=document.getElementById("e2ee-confirm-password-input"),f=document.getElementById("e2ee-password-error"),w=y?y.value:"",h=x?x.value:"",b=E?E.value:"";if(w.length===0){f&&(f.textContent=gettext("Please enter the current password."));return}let C=B(h);if(!C.valid){f&&(f.textContent=C.message);return}if(g&&h!==b){f&&(f.textContent=gettext("Passwords do not match."));return}if(w===h){f&&(f.textContent=gettext("New password must be different from the current password."));return}$.close(),await i({currentPassword:w,newPassword:h}),d()}}],T={title:gettext("Change Document Password"),id:c,body:a,buttons:P,canClose:!0};$=new m(T),$.open(),setTimeout(()=>{s||document.querySelectorAll(`#${c} .e2ee-toggle-visibility`).forEach(w=>{w.addEventListener("click",()=>{let h=w.parentElement?.querySelector("input");if(h){let b=h;b.type==="password"?(b.type="text",w.innerHTML='<i class="fa-solid fa-eye-slash"></i>'):(b.type="password",w.innerHTML='<i class="fa-solid fa-eye"></i>')}})});let y=document.getElementById("e2ee-new-password-input");y&&!(s&&u)&&(y.addEventListener("input",()=>{let f=I(y.value),w=k(f),h=document.getElementById("e2ee-strength-bar"),b=document.getElementById("e2ee-strength-label");h&&(h.className=`e2ee-strength-bar ${w.cssClass}`,h.style.width=`${(f+1)*25}%`),b&&(b.textContent=w.label,b.className=`e2ee-strength-label ${w.cssClass}`)}),y.dispatchEvent(new Event("input"))),y&&u&&y.addEventListener("input",()=>{if(y.value!==p){g=!0;let f=document.getElementById("e2ee-confirm-field");f&&(f.style.display="");let w=document.querySelector(`#${c} .e2ee-strength-meter`);w&&(w.style.display="")}});let x=document.getElementById("e2ee-confirm-password-input");x&&x.addEventListener("keypress",f=>{f.key==="Enter"&&(f.preventDefault(),P[0].click?.())});let E=document.getElementById("e2ee-current-password-input");E&&!r?E.focus():y&&y.focus()},100)})}function R(i){return new Promise(n=>{let d="e2ee-setup-passphrase",c=`
            <div class="e2ee-password-dialog">
                <p>${gettext("Set up a personal encryption passphrase. This passphrase will unlock all your encrypted documents \u2014 you will not need separate passwords for each document.")}</p>
                <p class="e2ee-password-hint"><strong>${gettext("Important:")}</strong> ${gettext("This passphrase is separate from your login password. If you lose it, your encrypted documents cannot be recovered.")}</p>
                <div class="e2ee-password-field">
                    <label for="e2ee-passphrase-input">${gettext("Passphrase")}</label>
                    <input type="password" id="e2ee-passphrase-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" />
                    <button type="button" class="e2ee-toggle-visibility" title="${gettext("Show passphrase")}">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
                <div class="e2ee-strength-meter">
                    <div class="e2ee-strength-bar" id="e2ee-strength-bar"></div>
                    <span class="e2ee-strength-label" id="e2ee-strength-label"></span>
                </div>
                <div class="e2ee-password-field">
                    <label for="e2ee-confirm-passphrase-input">${gettext("Confirm passphrase")}</label>
                    <input type="password" id="e2ee-confirm-passphrase-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" />
                </div>
                <div class="e2ee-password-error" id="e2ee-passphrase-error"></div>
            </div>
        `,l,p=[{text:gettext("Set Up Encryption"),classes:"fw-button fw-dark",click:async()=>{let r=document.getElementById("e2ee-passphrase-input"),s=document.getElementById("e2ee-confirm-passphrase-input"),o=document.getElementById("e2ee-passphrase-error"),e=r?r.value:"",t=s?s.value:"";if(e.length<8){o&&(o.textContent=gettext("Passphrase must be at least 8 characters long."));return}if(e!==t){o&&(o.textContent=gettext("Passphrases do not match."));return}l.close(),await i(e),n()}}],u={title:gettext("Set Up Personal Encryption"),id:d,body:c,buttons:p,canClose:!0,width:450};l=new m(u),l.open(),requestAnimationFrame(()=>{let r=document.getElementById(d);r&&(r.scrollTop=0)}),setTimeout(()=>{document.querySelectorAll(`#${d} .e2ee-toggle-visibility`).forEach(e=>{e.addEventListener("click",()=>{let t=e.parentElement?.querySelector("input");if(t){let a=t;a.type==="password"?(a.type="text",e.innerHTML='<i class="fa-solid fa-eye-slash"></i>'):(a.type="password",e.innerHTML='<i class="fa-solid fa-eye"></i>')}})});let s=document.getElementById("e2ee-passphrase-input");s&&(s.addEventListener("input",()=>{let e=I(s.value),t=k(e),a=document.getElementById("e2ee-strength-bar"),g=document.getElementById("e2ee-strength-label");a&&(a.className=`e2ee-strength-bar ${t.cssClass}`,a.style.width=`${(e+1)*25}%`),g&&(g.textContent=t.label,g.className=`e2ee-strength-label ${t.cssClass}`)}),s.dispatchEvent(new Event("input")),s.focus());let o=document.getElementById("e2ee-confirm-passphrase-input");o&&o.addEventListener("keypress",e=>{e.key==="Enter"&&(e.preventDefault(),p[0].click?.())})},100)})}function K(i,n=null,d={}){return new Promise(c=>{let l="e2ee-enter-passphrase",p=d.errorMessage||"",u=`
            <div class="e2ee-password-dialog">
                <p>${gettext("Enter your personal encryption passphrase to unlock your documents.")}</p>
                <div class="e2ee-password-field">
                    <label for="e2ee-passphrase-input">${gettext("Passphrase")}</label>
                    <input type="password" id="e2ee-passphrase-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" autofocus />
                    <button type="button" class="e2ee-toggle-visibility" title="${gettext("Show passphrase")}">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
                <div class="e2ee-password-error" id="e2ee-passphrase-error">${v(p)}</div>
            </div>
        `,r,s=[{text:gettext("Unlock"),classes:"fw-button fw-dark",click:()=>{let e=document.getElementById("e2ee-passphrase-input"),t=e?e.value:"";if(t.length===0){let a=document.getElementById("e2ee-passphrase-error");a&&(a.textContent=gettext("Please enter your passphrase."));return}r.close(),i(t),c()}},{text:gettext("Cancel"),classes:"fw-button fw-light",click:()=>{r.close(),c()}}];n&&s.push({text:gettext("Recover with key"),classes:"fw-button fw-orange",click:()=>{r.close(),n(),c()}});let o={title:gettext("Unlock Encryption"),id:l,body:u,buttons:s,canClose:!0};r=new m(o),r.open(),setTimeout(()=>{let e=document.querySelector(`#${l} .e2ee-toggle-visibility`),t=document.getElementById("e2ee-passphrase-input");if(e&&t){let a=e;a.addEventListener("click",()=>{let g=t;g.type==="password"?(g.type="text",a.innerHTML='<i class="fa-solid fa-eye-slash"></i>',a.title=gettext("Hide passphrase")):(g.type="password",a.innerHTML='<i class="fa-solid fa-eye"></i>',a.title=gettext("Show passphrase"))})}t&&(t.addEventListener("keypress",a=>{a.key==="Enter"&&(a.preventDefault(),s[0].click?.())}),t.focus())},100)})}function V(i,n){return new Promise(d=>{let c="e2ee-recovery-key",l=`
            <div class="e2ee-password-dialog">
                <p><strong>${gettext("This is your recovery key.")}</strong></p>
                <p>${gettext("Store it somewhere safe (e.g., a password manager, printed copy). If you forget your passphrase, this is the ONLY way to recover your encrypted documents. We cannot recover it for you.")}</p>
                <div class="e2ee-recovery-key-box">
                    <code id="e2ee-recovery-key-value">${i}</code>
                    <button type="button" class="fw-button fw-light" id="e2ee-copy-recovery-key">
                        <i class="fa-solid fa-copy"></i> ${gettext("Copy")}
                    </button>
                </div>
                <p class="e2ee-password-hint"><strong>${gettext("Copy it now \u2014 it will not be shown again.")}</strong></p>
            </div>
        `,p,u=[{text:gettext("I have saved it"),classes:"fw-button fw-dark",click:()=>{p.close(),n(),d()}}],r={title:gettext("Recovery Key"),id:c,body:l,buttons:u,canClose:!1};p=new m(r),p.open(),setTimeout(()=>{let s=document.getElementById("e2ee-copy-recovery-key");s&&s.addEventListener("click",()=>{navigator.clipboard.writeText(i).then(()=>{s.innerHTML=`<i class="fa-solid fa-check"></i> ${gettext("Copied!")}`,setTimeout(()=>{s.innerHTML=`<i class="fa-solid fa-copy"></i> ${gettext("Copy")}`},2e3)})})},100)})}function W(i){return new Promise(n=>{let d="e2ee-recover-with-key",c=`
            <div class="e2ee-password-dialog">
                <p>${gettext("Enter your recovery key and a new passphrase to regain access to your encrypted documents.")}</p>
                <div class="e2ee-password-field">
                    <label for="e2ee-recovery-key-input">${gettext("Recovery key")}</label>
                    <input type="text" id="e2ee-recovery-key-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" autofocus />
                </div>
                <div class="e2ee-password-field">
                    <label for="e2ee-new-passphrase-input">${gettext("New passphrase")}</label>
                    <input type="password" id="e2ee-new-passphrase-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" />
                    <button type="button" class="e2ee-toggle-visibility" title="${gettext("Show passphrase")}">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
                <div class="e2ee-password-field">
                    <label for="e2ee-confirm-passphrase-input">${gettext("Confirm new passphrase")}</label>
                    <input type="password" id="e2ee-confirm-passphrase-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" />
                </div>
                <div class="e2ee-password-error" id="e2ee-recover-error"></div>
            </div>
        `,l,p=[{text:gettext("Recover"),classes:"fw-button fw-dark",click:()=>{let r=document.getElementById("e2ee-recovery-key-input"),s=document.getElementById("e2ee-new-passphrase-input"),o=document.getElementById("e2ee-confirm-passphrase-input"),e=document.getElementById("e2ee-recover-error"),t=r?r.value.trim():"",a=s?s.value:"",g=o?o.value:"";if(t.length===0){e&&(e.textContent=gettext("Please enter your recovery key."));return}if(a.length<8){e&&(e.textContent=gettext("Passphrase must be at least 8 characters long."));return}if(a!==g){e&&(e.textContent=gettext("Passphrases do not match."));return}l.close(),i({recoveryKey:t,newPassphrase:a}),n()}},{text:gettext("Cancel"),classes:"fw-button fw-light",click:()=>{l.close(),n()}}],u={title:gettext("Recover Encryption"),id:d,body:c,buttons:p,canClose:!0};l=new m(u),l.open(),setTimeout(()=>{document.querySelectorAll(`#${d} .e2ee-toggle-visibility`).forEach(o=>{o.addEventListener("click",()=>{let e=o.parentElement?.querySelector("input");if(e){let t=e;t.type==="password"?(t.type="text",o.innerHTML='<i class="fa-solid fa-eye-slash"></i>'):(t.type="password",o.innerHTML='<i class="fa-solid fa-eye"></i>')}})});let s=document.getElementById("e2ee-confirm-passphrase-input");s&&s.addEventListener("keypress",o=>{o.key==="Enter"&&(o.preventDefault(),p[0].click?.())})},100)})}function z(i){return new Promise(n=>{let d="e2ee-change-passphrase",c=`
            <div class="e2ee-password-dialog">
                <p>${gettext("Enter your current passphrase and a new passphrase to change your encryption password.")}</p>
                <div class="e2ee-password-field">
                    <label for="e2ee-old-passphrase-input">${gettext("Current passphrase")}</label>
                    <input type="password" id="e2ee-old-passphrase-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" autofocus />
                    <button type="button" class="e2ee-toggle-visibility" title="${gettext("Show passphrase")}">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
                <div class="e2ee-password-field">
                    <label for="e2ee-new-passphrase-input">${gettext("New passphrase")}</label>
                    <input type="password" id="e2ee-new-passphrase-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" />
                    <button type="button" class="e2ee-toggle-visibility" title="${gettext("Show passphrase")}">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
                <div class="e2ee-password-field">
                    <label for="e2ee-confirm-new-passphrase-input">${gettext("Confirm new passphrase")}</label>
                    <input type="password" id="e2ee-confirm-new-passphrase-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" />
                </div>
                <div class="e2ee-password-error" id="e2ee-change-error"></div>
            </div>
        `,l,p=[{text:gettext("Change Passphrase"),classes:"fw-button fw-dark",click:async()=>{let r=document.getElementById("e2ee-old-passphrase-input"),s=document.getElementById("e2ee-new-passphrase-input"),o=document.getElementById("e2ee-confirm-new-passphrase-input"),e=document.getElementById("e2ee-change-error"),t=r?r.value:"",a=s?s.value:"",g=o?o.value:"";if(t.length===0){e&&(e.textContent=gettext("Please enter your current passphrase."));return}if(a.length<8){e&&(e.textContent=gettext("Passphrase must be at least 8 characters long."));return}if(a!==g){e&&(e.textContent=gettext("Passphrases do not match."));return}l.close(),await i({oldPassphrase:t,newPassphrase:a}),n()}},{text:gettext("Cancel"),classes:"fw-button fw-light",click:()=>{l.close(),n()}}],u={title:gettext("Change Encryption Passphrase"),id:d,body:c,buttons:p,canClose:!0};l=new m(u),l.open(),setTimeout(()=>{document.querySelectorAll(`#${d} .e2ee-toggle-visibility`).forEach(o=>{o.addEventListener("click",()=>{let e=o.parentElement?.querySelector("input");if(e){let t=e;t.type==="password"?(t.type="text",o.innerHTML='<i class="fa-solid fa-eye-slash"></i>'):(t.type="password",o.innerHTML='<i class="fa-solid fa-eye"></i>')}})});let s=document.getElementById("e2ee-confirm-new-passphrase-input");s&&s.addEventListener("keypress",o=>{o.key==="Enter"&&(o.preventDefault(),p[0].click?.())})},100)})}export{D as a,M as b,H as c,R as d,K as e,V as f,W as g,z as h};
//# sourceMappingURL=chunk-DHIDMBDV.js.map
