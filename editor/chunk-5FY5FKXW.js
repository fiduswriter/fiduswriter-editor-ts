import{k as m,v as E}from"./chunk-RYGM4I4G.js";function B(i){return!i||i.length<5?{valid:!1,message:gettext("Password must be at least 5 characters long.")}:{valid:!0,message:""}}function $(i){if(!i)return 0;let n=0;i.length>=12&&n++,i.length>=16&&n++,i.length>=20&&n++;let d=/[a-z]/.test(i),c=/[A-Z]/.test(i),l=/[0-9]/.test(i),p=/[^a-zA-Z0-9]/.test(i);[d,c,l,p].filter(Boolean).length>=3&&n++;let r=[/^123456/,/^123123/,/^password/i,/^qwerty/i,/^abc123/i,/(.)\1{3,}/];for(let s of r)if(s.test(i)){n=Math.max(0,n-2);break}return Math.min(4,Math.max(0,n))}function P(i){let n=[{cssClass:"very-weak",label:gettext("Very weak")},{cssClass:"weak",label:gettext("Weak")},{cssClass:"fair",label:gettext("Fair")},{cssClass:"strong",label:gettext("Strong")},{cssClass:"very-strong",label:gettext("Very strong")}];return n[i]||n[0]}function D(i,n="",d=null){return new Promise(c=>{let l="e2ee-enter-password";if(n&&n.length>0){i(n),c();return}let p=`
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
        `,u,r=[{text:gettext("Decrypt"),classes:"fw-button fw-dark",click:()=>{let o=document.getElementById("e2ee-password-input"),t=o?o.value:"";if(t.length===0){let e=document.getElementById("e2ee-password-error");e&&(e.textContent=gettext("Please enter the password."));return}u.close(),i(t),c()}},{text:gettext("Cancel"),classes:"fw-button fw-light",click:()=>{u.close(),typeof d=="function"&&d(),c()}}],s={title:gettext("Encrypted Document"),id:l,body:p,buttons:r,canClose:!0};u=new m(s),u.open(),setTimeout(()=>{let o=document.querySelector(`#${l} .e2ee-toggle-visibility`),t=document.getElementById("e2ee-password-input");if(o&&t){let e=o;e.addEventListener("click",()=>{let a=t;a.type==="password"?(a.type="text",e.innerHTML='<i class="fa-solid fa-eye-slash"></i>',e.title=gettext("Hide password")):(a.type="password",e.innerHTML='<i class="fa-solid fa-eye"></i>',e.title=gettext("Show password"))})}t&&(t.addEventListener("keypress",e=>{e.key==="Enter"&&(e.preventDefault(),r[0].click?.())}),t.focus())},100)})}function M(i){return new Promise(n=>{let d="e2ee-create-password",c=`
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
        `,l,p=[{text:gettext("Create Encrypted Document"),classes:"fw-button fw-dark",click:()=>{let r=document.getElementById("e2ee-new-password-input"),s=document.getElementById("e2ee-confirm-password-input"),o=document.getElementById("e2ee-password-error"),t=r?r.value:"",e=s?s.value:"",a=B(t);if(!a.valid){o&&(o.textContent=a.message);return}if(t!==e){o&&(o.textContent=gettext("Passwords do not match."));return}l.close(),i(t),n()}}],u={title:gettext("Set Document Password"),id:d,body:c,buttons:p,canClose:!0};l=new m(u),l.open(),setTimeout(()=>{document.querySelectorAll(`#${d} .e2ee-toggle-visibility`).forEach(t=>{t.addEventListener("click",()=>{let e=t.parentElement?.querySelector("input");if(e){let a=e;a.type==="password"?(a.type="text",t.innerHTML='<i class="fa-solid fa-eye-slash"></i>'):(a.type="password",t.innerHTML='<i class="fa-solid fa-eye"></i>')}})});let s=document.getElementById("e2ee-new-password-input");s&&(s.addEventListener("input",()=>{let t=$(s.value),e=P(t),a=document.getElementById("e2ee-strength-bar"),g=document.getElementById("e2ee-strength-label");a&&(a.className=`e2ee-strength-bar ${e.cssClass}`,a.style.width=`${(t+1)*25}%`),g&&(g.textContent=e.label,g.className=`e2ee-strength-label ${e.cssClass}`)}),s.dispatchEvent(new Event("input")),s.focus());let o=document.getElementById("e2ee-confirm-password-input");o&&o.addEventListener("keypress",t=>{t.key==="Enter"&&(t.preventDefault(),p[0].click?.())})},100)})}function H(i,n={}){return new Promise(d=>{let c="e2ee-change-password",l=n.currentPassword||"",p=n.suggestedNewPassword||"",u=p.length>0,r=n.hideCurrentPassword||!1,s=n.showNewPasswordPlaintext||!1,o=n.infoText||"",t=r?`<input type="hidden" id="e2ee-current-password-input" value="${E(l)}" />`:`<div class="e2ee-password-field">
                    <label for="e2ee-current-password-input">${gettext("Current password")}</label>
                    <input type="password" id="e2ee-current-password-input" class="e2ee-password-input"
                           value="${E(l)}"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" autofocus />
                </div>
                <hr />`,e=s?"text":"password",a=`
            <div class="e2ee-password-dialog">
                <p>${gettext("Change the document password. After changing, you must share the new password with all collaborators.")}</p>
                ${o?`<p class="e2ee-password-hint">${o}</p>`:""}
                ${t}
                <div class="e2ee-password-field">
                    <label for="e2ee-new-password-input">${gettext("New password")}</label>
                    <input type="${e}" id="e2ee-new-password-input" class="e2ee-password-input"
                           value="${E(p)}"
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
        `,g=!u,x,b=[{text:gettext("Change Password"),classes:"fw-button fw-dark",click:async()=>{let y=document.getElementById("e2ee-current-password-input"),I=document.getElementById("e2ee-new-password-input"),k=document.getElementById("e2ee-confirm-password-input"),f=document.getElementById("e2ee-password-error"),w=y?y.value:"",h=I?I.value:"",v=k?k.value:"";if(w.length===0){f&&(f.textContent=gettext("Please enter the current password."));return}let C=B(h);if(!C.valid){f&&(f.textContent=C.message);return}if(g&&h!==v){f&&(f.textContent=gettext("Passwords do not match."));return}if(w===h){f&&(f.textContent=gettext("New password must be different from the current password."));return}x.close(),await i({currentPassword:w,newPassword:h}),d()}}],T={title:gettext("Change Document Password"),id:c,body:a,buttons:b,canClose:!0};x=new m(T),x.open(),setTimeout(()=>{s||document.querySelectorAll(`#${c} .e2ee-toggle-visibility`).forEach(w=>{w.addEventListener("click",()=>{let h=w.parentElement?.querySelector("input");if(h){let v=h;v.type==="password"?(v.type="text",w.innerHTML='<i class="fa-solid fa-eye-slash"></i>'):(v.type="password",w.innerHTML='<i class="fa-solid fa-eye"></i>')}})});let y=document.getElementById("e2ee-new-password-input");y&&!(s&&u)&&(y.addEventListener("input",()=>{let f=$(y.value),w=P(f),h=document.getElementById("e2ee-strength-bar"),v=document.getElementById("e2ee-strength-label");h&&(h.className=`e2ee-strength-bar ${w.cssClass}`,h.style.width=`${(f+1)*25}%`),v&&(v.textContent=w.label,v.className=`e2ee-strength-label ${w.cssClass}`)}),y.dispatchEvent(new Event("input"))),y&&u&&y.addEventListener("input",()=>{if(y.value!==p){g=!0;let f=document.getElementById("e2ee-confirm-field");f&&(f.style.display="");let w=document.querySelector(`#${c} .e2ee-strength-meter`);w&&(w.style.display="")}});let I=document.getElementById("e2ee-confirm-password-input");I&&I.addEventListener("keypress",f=>{f.key==="Enter"&&(f.preventDefault(),b[0].click?.())});let k=document.getElementById("e2ee-current-password-input");k&&!r?k.focus():y&&y.focus()},100)})}function U(i){return new Promise(n=>{let d="e2ee-setup-passphrase",c=`
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
        `,l,p=[{text:gettext("Set Up Encryption"),classes:"fw-button fw-dark",click:async()=>{let r=document.getElementById("e2ee-passphrase-input"),s=document.getElementById("e2ee-confirm-passphrase-input"),o=document.getElementById("e2ee-passphrase-error"),t=r?r.value:"",e=s?s.value:"";if(t.length<8){o&&(o.textContent=gettext("Passphrase must be at least 8 characters long."));return}if(t!==e){o&&(o.textContent=gettext("Passphrases do not match."));return}l.close(),await i(t),n()}}],u={title:gettext("Set Up Personal Encryption"),id:d,body:c,buttons:p,canClose:!0,width:450};l=new m(u),l.open(),requestAnimationFrame(()=>{let r=document.getElementById(d);r&&(r.scrollTop=0)}),setTimeout(()=>{document.querySelectorAll(`#${d} .e2ee-toggle-visibility`).forEach(t=>{t.addEventListener("click",()=>{let e=t.parentElement?.querySelector("input");if(e){let a=e;a.type==="password"?(a.type="text",t.innerHTML='<i class="fa-solid fa-eye-slash"></i>'):(a.type="password",t.innerHTML='<i class="fa-solid fa-eye"></i>')}})});let s=document.getElementById("e2ee-passphrase-input");s&&(s.addEventListener("input",()=>{let t=$(s.value),e=P(t),a=document.getElementById("e2ee-strength-bar"),g=document.getElementById("e2ee-strength-label");a&&(a.className=`e2ee-strength-bar ${e.cssClass}`,a.style.width=`${(t+1)*25}%`),g&&(g.textContent=e.label,g.className=`e2ee-strength-label ${e.cssClass}`)}),s.dispatchEvent(new Event("input")),s.focus());let o=document.getElementById("e2ee-confirm-passphrase-input");o&&o.addEventListener("keypress",t=>{t.key==="Enter"&&(t.preventDefault(),p[0].click?.())})},100)})}function K(i,n=null,d={}){return new Promise(c=>{let l="e2ee-enter-passphrase",p=d.errorMessage||"",u=`
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
                <div class="e2ee-password-error" id="e2ee-passphrase-error">${E(p)}</div>
            </div>
        `,r,s=[{text:gettext("Unlock"),classes:"fw-button fw-dark",click:()=>{let t=document.getElementById("e2ee-passphrase-input"),e=t?t.value:"";if(e.length===0){let a=document.getElementById("e2ee-passphrase-error");a&&(a.textContent=gettext("Please enter your passphrase."));return}r.close(),i(e),c()}},{text:gettext("Cancel"),classes:"fw-button fw-light",click:()=>{r.close(),c()}}];n&&s.push({text:gettext("Recover with key"),classes:"fw-button fw-orange",click:()=>{r.close(),n(),c()}});let o={title:gettext("Unlock Encryption"),id:l,body:u,buttons:s,canClose:!0};r=new m(o),r.open(),setTimeout(()=>{let t=document.querySelector(`#${l} .e2ee-toggle-visibility`),e=document.getElementById("e2ee-passphrase-input");if(t&&e){let a=t;a.addEventListener("click",()=>{let g=e;g.type==="password"?(g.type="text",a.innerHTML='<i class="fa-solid fa-eye-slash"></i>',a.title=gettext("Hide passphrase")):(g.type="password",a.innerHTML='<i class="fa-solid fa-eye"></i>',a.title=gettext("Show passphrase"))})}e&&(e.addEventListener("keypress",a=>{a.key==="Enter"&&(a.preventDefault(),s[0].click?.())}),e.focus())},100)})}function V(i,n){return new Promise(d=>{let c="e2ee-recovery-key",l=`
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
                <div class="e2ee-password-field">
                    <label for="e2ee-recover-account-password">${gettext("Account password")}</label>
                    <input type="password" id="e2ee-recover-account-password" class="e2ee-password-input"
                           autocomplete="current-password" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" />
                    <p>${gettext("Recovering encryption keys requires confirming your account password.")}</p>
                </div>
                <div class="e2ee-password-error" id="e2ee-recover-error"></div>
            </div>
        `,l,p=[{text:gettext("Recover"),classes:"fw-button fw-dark",click:()=>{let r=document.getElementById("e2ee-recovery-key-input"),s=document.getElementById("e2ee-new-passphrase-input"),o=document.getElementById("e2ee-confirm-passphrase-input"),t=document.getElementById("e2ee-recover-account-password"),e=document.getElementById("e2ee-recover-error"),a=r?r.value.trim():"",g=s?s.value:"",x=o?o.value:"",b=t?t.value:"";if(a.length===0){e&&(e.textContent=gettext("Please enter your recovery key."));return}if(g.length<8){e&&(e.textContent=gettext("Passphrase must be at least 8 characters long."));return}if(g!==x){e&&(e.textContent=gettext("Passphrases do not match."));return}if(b.length===0){e&&(e.textContent=gettext("Please enter your account password."));return}l.close(),i({recoveryKey:a,newPassphrase:g,accountPassword:b}),n()}},{text:gettext("Cancel"),classes:"fw-button fw-light",click:()=>{l.close(),n()}}],u={title:gettext("Recover Encryption"),id:d,body:c,buttons:p,canClose:!0};l=new m(u),l.open(),setTimeout(()=>{document.querySelectorAll(`#${d} .e2ee-toggle-visibility`).forEach(o=>{o.addEventListener("click",()=>{let t=o.parentElement?.querySelector("input");if(t){let e=t;e.type==="password"?(e.type="text",o.innerHTML='<i class="fa-solid fa-eye-slash"></i>'):(e.type="password",o.innerHTML='<i class="fa-solid fa-eye"></i>')}})});let s=document.getElementById("e2ee-confirm-passphrase-input");s&&s.addEventListener("keypress",o=>{o.key==="Enter"&&(o.preventDefault(),p[0].click?.())})},100)})}function z(i){return new Promise(n=>{let d="e2ee-change-passphrase",c=`
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
                <div class="e2ee-password-field">
                    <label for="e2ee-change-account-password">${gettext("Account password")}</label>
                    <input type="password" id="e2ee-change-account-password" class="e2ee-password-input"
                           autocomplete="current-password" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" />
                    <p>${gettext("Changing encryption keys requires confirming your account password.")}</p>
                </div>
                <div class="e2ee-password-error" id="e2ee-change-error"></div>
            </div>
        `,l,p=[{text:gettext("Change Passphrase"),classes:"fw-button fw-dark",click:async()=>{let r=document.getElementById("e2ee-old-passphrase-input"),s=document.getElementById("e2ee-new-passphrase-input"),o=document.getElementById("e2ee-confirm-new-passphrase-input"),t=document.getElementById("e2ee-change-account-password"),e=document.getElementById("e2ee-change-error"),a=r?r.value:"",g=s?s.value:"",x=o?o.value:"",b=t?t.value:"";if(a.length===0){e&&(e.textContent=gettext("Please enter your current passphrase."));return}if(g.length<8){e&&(e.textContent=gettext("Passphrase must be at least 8 characters long."));return}if(g!==x){e&&(e.textContent=gettext("Passphrases do not match."));return}if(b.length===0){e&&(e.textContent=gettext("Please enter your account password."));return}l.close(),await i({oldPassphrase:a,newPassphrase:g,accountPassword:b}),n()}},{text:gettext("Cancel"),classes:"fw-button fw-light",click:()=>{l.close(),n()}}],u={title:gettext("Change Encryption Passphrase"),id:d,body:c,buttons:p,canClose:!0};l=new m(u),l.open(),setTimeout(()=>{document.querySelectorAll(`#${d} .e2ee-toggle-visibility`).forEach(o=>{o.addEventListener("click",()=>{let t=o.parentElement?.querySelector("input");if(t){let e=t;e.type==="password"?(e.type="text",o.innerHTML='<i class="fa-solid fa-eye-slash"></i>'):(e.type="password",o.innerHTML='<i class="fa-solid fa-eye"></i>')}})});let s=document.getElementById("e2ee-confirm-new-passphrase-input");s&&s.addEventListener("keypress",o=>{o.key==="Enter"&&(o.preventDefault(),p[0].click?.())})},100)})}export{D as a,M as b,H as c,U as d,K as e,V as f,W as g,z as h};
//# sourceMappingURL=chunk-5FY5FKXW.js.map
