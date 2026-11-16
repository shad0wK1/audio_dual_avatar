// Generated from the adjacent editor source files. Run npm run build:client after editing.
import {createScope} from "./client-scope.js";
export function mountScriptStudio(host, options) {
const scope = createScope(host, options, "@charset \"UTF-8\";\r\n:host{color-scheme:dark;--bg:#0c0c0c;--rail:#101010;--panel:#121212;--input:#1b1b1b;--line:#292929;--text:#dedede;--muted:#858585;--green:#66bb91;--rail-width:clamp(68px,5.3vw,102px);--tree-width:clamp(190px,14.85vw,285px);font-family:\"Microsoft YaHei\",\"PingFang SC\",system-ui,sans-serif;font-size:14px;font-synthesis:none}\r\n*{box-sizing:border-box}.studio-body{margin:0;background:var(--bg);color:var(--text)}button,input,textarea,select{font:inherit}button{cursor:pointer;background:none;border:0;color:inherit}a{color:inherit;text-decoration:none}input,textarea,select{color:inherit}button:disabled{opacity:.4;cursor:not-allowed}button:focus-visible,a:focus-visible{outline:2px solid var(--green);outline-offset:3px}input:focus,textarea:focus,select:focus{outline:none;border-color:var(--line)!important;box-shadow:0 0 0 2px rgba(80,90,120,.12)}svg{height:20px;width:20px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0}::selection{background:var(--surface-active);color:var(--ink)}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-thumb{background:var(--field-bg);border-radius:5px}::-webkit-scrollbar-track{background:transparent}textarea{resize:vertical;line-height:1.75}input::placeholder,textarea::placeholder{color:var(--muted)}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}\r\n.rail{position:fixed;inset:0 auto 0 0;width:var(--rail-width);background:var(--rail);border-right:1px solid var(--line);display:flex;flex-direction:column;align-items:center;padding:22px 8px 17px;z-index:30}.logo{width:45px;height:45px;background:var(--field-bg);border-radius:12px;padding:10px;display:grid;grid-template-columns:1fr 1fr;gap:4px;flex-shrink:0}.logo span{border-radius:2px;background:var(--field-bg)}.logo span:first-child{background:var(--surface-active)}.logo span:last-child{background:var(--field-bg)}.rail-nav{display:flex;flex-direction:column;width:100%;gap:18px;margin-top:35px}.rail-link{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:9px;color:var(--muted);width:100%;position:relative;padding:7px 0;font-size:13px}.rail-link:hover,.rail-link.active{color:var(--ink)}.rail-link svg{width:22px;height:22px}.rail-link.community{color:var(--muted)}.new-badge{position:absolute;font-size:8px;top:-1px;left:calc(50% + 1px);border:1px solid var(--line);color:var(--danger);line-height:12px;border-radius:3px;padding:0 2px}.language{margin-top:auto;width:calc(var(--rail-width) - 9px);background:none;border:0;color:var(--muted);cursor:pointer;font-size:11px;padding:7px 0}.workspace{margin-left:var(--rail-width);height:100vh;display:flex;flex-direction:column;min-width:0}.project-header{height:78px;flex-shrink:0;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:16px;padding:0 28px;background:var(--surface)}.breadcrumb{display:flex;align-items:center;gap:15px;white-space:nowrap;min-width:0}.breadcrumb .crumb{color:var(--muted);font-size:15px}.breadcrumb strong{font-size:18px;max-width:310px;text-overflow:ellipsis;overflow:hidden}.badge{border:1px solid var(--line);background:var(--surface);color:var(--accent-deep);border-radius:20px;padding:5px 11px;font-size:12px;white-space:nowrap}.header-actions{display:flex;align-items:center;gap:12px}.button{border:1px solid var(--line);background:var(--field-bg);border-radius:7px;padding:10px 15px;display:inline-flex;gap:7px;align-items:center;justify-content:center;font-size:13px;line-height:1.5;white-space:nowrap;transition:background .15s,border-color .15s}.button:hover{background:var(--field-bg);border-color:var(--line)}.button svg{width:17px;height:17px}.button.primary{background:var(--field-bg);color:var(--muted);border-color:var(--line);font-weight:650}.button.primary:hover{background:var(--field-bg)}.button.green{background:var(--field-bg);color:var(--accent-deep);border-color:var(--line)}.button.ghost{background:transparent}.button.danger{color:var(--danger);border-color:var(--line)}.button.small{font-size:12px;padding:7px 11px}.icon-button{width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;border-radius:5px;color:var(--muted);padding:6px}.icon-button:hover{background:var(--field-bg);color:var(--ink)}.icon-button svg{width:18px;height:18px}.user-menu{border:1px solid var(--line);padding:5px 9px 5px 5px;border-radius:7px;background:var(--surface);display:flex;gap:10px;align-items:center}.user-menu .user-avatar{background:var(--field-bg);color:var(--accent-deep);height:32px;width:32px;border-radius:50%;display:grid;place-items:center;font-size:12px}.user-menu strong{font-size:13px;color:var(--accent-deep)}.user-menu small{font-size:9px;background:var(--field-bg);padding:3px 5px;color:var(--muted);border-radius:3px}.module-nav{height:58px;border-bottom:1px solid var(--line);display:flex;align-items:stretch;padding:0 22px;gap:12px;flex-shrink:0;overflow-x:auto;background:var(--surface)}.module-link{display:flex;gap:9px;align-items:center;padding:0 16px;border-bottom:2px solid transparent;color:var(--muted);font-size:15px;white-space:nowrap}.module-link:hover{color:var(--ink)}.module-link.active{color:var(--ink);border-bottom-color:var(--line)}.module-link svg{width:20px;height:20px}\r\n.module-body{display:flex;flex:1;min-height:0;overflow:hidden}.section-tree{width:var(--tree-width);flex-shrink:0;background:var(--surface);border-right:1px solid var(--line);padding:30px 15px;overflow-y:auto}.tree-title{display:flex;gap:13px;align-items:center;padding:0 11px 27px}.tree-title svg{width:24px;height:24px;color:var(--ink)}.tree-title strong{font-size:18px;font-weight:650;display:block}.tree-status{font-size:12px;color:var(--muted);margin-top:7px}.tree-status.pending{color:var(--warning)}.tree-button{width:100%;text-align:left;padding:17px 14px;display:flex;align-items:center;justify-content:space-between;border-radius:7px;font-size:15px;color:var(--muted);line-height:1.2}.tree-button:hover{color:var(--ink);background:var(--field-bg)}.tree-button.active{background:var(--field-bg);color:var(--ink)}.tree-button>span:last-child{font-size:14px;color:var(--muted)}.editor-panel{flex:1;min-width:0;display:flex;flex-direction:column;background:var(--surface)}.panel-heading{height:98px;flex-shrink:0;padding:22px 32px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);background:var(--surface);gap:18px}.panel-heading h1{font-size:18px;line-height:1.4;margin:0 0 7px;font-weight:650}.save-state{color:var(--muted);font-size:12px}.panel-heading .button{color:var(--muted);padding:12px 14px;background:var(--field-bg)}.form-scroll{flex:1;overflow-y:auto;scrollbar-gutter:stable;padding:32px;min-height:0}.form-content{max-width:1280px;margin:0 auto 20px}.field{margin-bottom:22px;min-width:0}.field label{display:block;font-size:13px;color:var(--muted);margin-bottom:10px;line-height:1.4}.field input,.field textarea,.field select,.input{display:block;width:100%;border:1px solid var(--line);background:var(--field-bg);border-radius:7px;padding:13px 15px;color:var(--ink);font-size:14px;line-height:1.75;min-height:46px}.field textarea{min-height:112px}.field textarea.large{min-height:190px}.field textarea.tall{min-height:230px}.field textarea.compact{min-height:90px}.row{display:grid;grid-template-columns:1fr 1fr;gap:18px}.field:last-child{margin-bottom:0}.row .field{margin-bottom:22px}.editor-footer{min-height:74px;flex-shrink:0;border-top:1px solid var(--line);padding:14px 24px;display:flex;align-items:center;justify-content:space-between;gap:18px;background:var(--surface)}.footer-note{display:flex;align-items:flex-start;gap:12px;font-size:12px;line-height:1.8;color:var(--muted)}.footer-note svg{color:var(--accent-deep);width:16px;height:16px;margin-top:3px}.footer-actions{display:flex;align-items:center;gap:8px}.footer-actions .button{padding:10px 16px}.icon-button:disabled{opacity:.25}.record-card{border:1px solid var(--line);background:var(--surface);border-radius:9px;margin-bottom:22px;padding:22px}.record-top{display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--line);padding-bottom:18px;margin-bottom:22px}.record-name{border:1px solid transparent;border-radius:5px;background:none;color:var(--ink);min-width:0;flex:1;padding:6px 7px;font-size:17px;font-weight:600}.record-name:hover{border-color:var(--line)}.episode-badge{font-size:12px;color:var(--accent-deep);font-weight:650;letter-spacing:1px}.duration{display:flex;gap:5px;align-items:center;color:var(--muted);font-size:12px;white-space:nowrap}.duration input{width:46px;background:var(--field-bg);border:1px solid var(--line);color:var(--ink);border-radius:4px;padding:4px;text-align:center;appearance:textfield}.duration input::-webkit-inner-spin-button{appearance:none}.add-row{width:100%;border:1px dashed var(--line);background:var(--surface);color:var(--muted);padding:15px;border-radius:7px;display:flex;align-items:center;justify-content:center;gap:8px}.add-row:hover{background:var(--field-bg)}.empty{text-align:center;color:var(--muted);padding:60px 20px;border:1px dashed var(--line);border-radius:8px}.empty svg{width:32px;height:32px;color:var(--muted)}.empty h3{font-size:16px;font-weight:500;color:var(--ink);margin:15px 0 9px}.empty p{font-size:12px;line-height:1.9}.notice{font-size:12px;line-height:1.9;color:var(--muted);background:var(--surface);border:1px solid var(--line);padding:13px 15px;border-radius:6px;margin-bottom:20px}.notice.subtle{background:var(--surface);border-color:var(--line);color:var(--muted)}.notice.warning{background:var(--field-bg);border-color:var(--line);color:var(--warning)}.muted{color:var(--muted);font-size:12px}.pill{font-size:10px;border-radius:4px;background:var(--field-bg);color:var(--muted);padding:3px 7px;white-space:nowrap}.pill.confirmed{color:var(--accent-deep);background:var(--field-bg)}.pill.pending{color:var(--warning);background:var(--field-bg)}\r\n.full-scroll{flex:1;overflow-y:auto;padding:30px 32px}.library-top{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:28px}.library-top p{font-size:12px;color:var(--muted);margin:0 0 8px}.library-top h1{font-size:25px;margin:0;font-weight:650}.library-tools{display:flex;gap:10px;align-items:center}.entity-tabs{display:flex;gap:8px;margin-bottom:24px}.entity-tabs button{padding:8px 14px;color:var(--muted);border:1px solid var(--line);border-radius:5px;background:var(--surface);font-size:12px}.entity-tabs button.active{background:var(--field-bg);color:var(--ink);border-color:var(--line)}.entity-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:20px}.entity-card{border:1px solid var(--line);border-radius:9px;background:var(--surface);padding:22px;min-height:232px;display:flex;flex-direction:column;position:relative}.entity-top{display:flex;align-items:center;gap:10px;margin-bottom:17px;padding-right:20px}.entity-top strong{font-size:16px}.entity-card>.icon-button{position:absolute;top:12px;right:11px}.entity-card p{color:var(--muted);font-size:13px;line-height:1.9;margin:0 0 25px;white-space:pre-wrap}.entity-bottom{display:flex;gap:8px;margin-top:auto;justify-content:flex-end}.entity-bottom .button{padding:7px 11px;font-size:12px}.quiet-link{font-size:12px;color:var(--muted);padding:5px 0}.quiet-link:hover{color:var(--ink)}.version-sidebar{width:310px;flex-shrink:0;border-right:1px solid var(--line);display:flex;flex-direction:column;background:var(--surface);padding:24px 16px 15px}.version-title{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:0 5px 22px}.version-title strong{font-size:17px}.version-list{flex:1;overflow:auto}.version-item{display:flex;flex-direction:column;gap:9px;padding:17px 14px;width:100%;text-align:left;border:1px solid var(--line);border-radius:7px;margin-bottom:12px;color:var(--ink);background:var(--surface)}.version-item.active{border-color:var(--line);background:var(--field-bg)}.version-item strong{font-weight:500;font-size:13px;display:flex;align-items:center;gap:8px}.version-item time,.version-item em{font-size:11px;color:var(--muted);font-style:normal}.version-sidebar>p{font-size:12px;color:var(--muted);line-height:1.8}.version-count{font-size:10px;color:var(--muted);border-top:1px solid var(--line);padding-top:17px}.reading-panel{flex:1;min-width:0;display:flex;flex-direction:column}.read-content{padding:28px 38px;overflow:auto;flex:1}.reading-episode{max-width:900px;margin:0 auto 35px}.reading-episode h2{font-size:17px;padding-bottom:17px;border-bottom:1px solid var(--line)}.reading-scene{margin-bottom:30px}.reading-scene h3{font-size:13px;color:var(--ink);background:var(--field-bg);padding:12px;border:1px solid var(--line);border-radius:5px;margin:18px 0}.reading-scene p{white-space:pre-wrap;color:var(--muted);font-size:14px;line-height:1.9}.reading-dialogue{max-width:480px;margin:18px auto}.reading-dialogue strong{font-size:13px;color:var(--ink)}.reading-dialogue small{color:var(--muted);display:block;margin-top:5px}.reading-dialogue p{margin:5px 0}\r\n.script-tree .tree-title{padding-bottom:20px}.script-tree .tree-button{flex-direction:column;align-items:flex-start;gap:8px;line-height:1.5;font-size:12px;padding:14px 12px}.script-tree .tree-button strong{font-size:13px;font-weight:500}.script-tree .tree-button small{font-size:10px;color:var(--muted)}.script-tree .button{width:100%;margin-top:20px}.script-tools{display:flex;gap:8px;align-items:center}.scene-card{border:1px solid var(--line);border-radius:8px;background:var(--surface);margin-bottom:25px;overflow:hidden}.scene-top{display:flex;align-items:center;padding:12px 16px;background:var(--field-bg);gap:10px;border-bottom:1px solid var(--line)}.scene-top label{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--muted);white-space:nowrap}.scene-top input[type=checkbox]{accent-color:var(--accent-deep);width:14px;height:14px}.scene-top input[type=text]{background:transparent;border:1px solid transparent;padding:5px 7px;border-radius:4px;min-width:0;flex:1;font-size:13px;color:var(--ink)}.scene-blocks{padding:16px 22px}.script-block{margin:12px 0 18px;position:relative;padding-right:27px}.script-block>textarea{width:100%;border:1px solid transparent;background:transparent;color:var(--ink);border-radius:4px;min-height:72px;padding:7px 8px;font-size:14px;line-height:1.9;resize:vertical}.script-block>textarea:hover{border-color:var(--line)}.script-block .block-delete{position:absolute;right:-4px;top:4px;opacity:.2}.script-block:hover .block-delete{opacity:1}.script-block.dialogue{max-width:600px;margin:20px auto;padding-left:30px}.speaker-row{display:flex;gap:8px}.speaker-row input{min-width:0;width:45%;background:var(--field-bg);color:var(--ink);border:1px solid var(--line);border-radius:5px;padding:8px 10px;font-size:12px}.speaker-row input:last-child{flex:1;color:var(--muted)}.block-tools{display:flex;justify-content:center;gap:10px;padding:2px 0 20px}.script-meta{font-size:11px;color:var(--muted);margin:8px 0 20px}.novel-editor{width:100%;min-height:480px;background:var(--field-bg);border:1px solid var(--line);color:var(--ink);padding:22px;border-radius:6px;line-height:2}\r\n.export-grid{max-width:1100px;margin:0 auto;display:grid;gap:22px}.export-card{border:1px solid var(--line);background:var(--surface);border-radius:9px;overflow:hidden}.export-card header{padding:23px 25px;border-bottom:1px solid var(--line);display:flex;gap:12px;align-items:flex-start}.export-card header>svg{color:var(--muted);width:22px;height:22px;margin-top:2px}.export-card header strong{font-size:17px;font-weight:550;display:block;margin-bottom:7px}.export-card header small{font-size:12px;color:var(--muted)}.export-card .card-body{padding:24px 25px}.export-card p{font-size:13px;line-height:1.9;color:var(--muted);margin:0 0 22px}.option-label{font-size:12px;color:var(--muted);margin:0 0 12px}.segmented{display:flex;gap:8px;margin-bottom:22px;flex-wrap:wrap}.segment{border:1px solid var(--line);background:var(--field-bg);color:var(--muted);padding:10px 16px;border-radius:6px;font-size:13px}.segment.active{background:var(--field-bg);border-color:var(--line);color:var(--muted)}.card-actions{display:flex;justify-content:flex-end;margin-top:21px}.project-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:22px}.project-card{background:var(--surface);border:1px solid var(--line);border-radius:10px;text-align:left;overflow:hidden}.project-cover{height:155px;background:radial-gradient(ellipse at top right,var(--field-bg),transparent 80%),var(--surface);display:flex;justify-content:center;align-items:center;position:relative;overflow:hidden}.project-cover>svg{width:55px;height:55px;color:var(--muted);stroke-width:1}.project-cover:after{content:'一 幕';position:absolute;font-size:100px;letter-spacing:20px;font-weight:800;opacity:.025;right:-25px;bottom:-35px}.project-card-info{padding:21px}.project-card-info h2{font-size:17px;margin:0 0 13px}.project-card-info p{font-size:12px;color:var(--muted);line-height:1.9;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;height:46px}.project-card-info small{font-size:10px;color:var(--muted)}.project-card:hover{border-color:var(--line)}.production-grid{display:grid;gap:20px;grid-template-columns:repeat(auto-fill,minmax(310px,1fr))}.shot-card{border:1px solid var(--line);border-radius:8px;background:var(--surface);overflow:hidden}.shot-frame{aspect-ratio:16/9;background:repeating-linear-gradient(135deg,var(--field-bg),var(--field-bg) 10px,var(--field-bg) 10px,var(--field-bg) 11px);display:flex;align-items:center;justify-content:center;color:var(--muted);position:relative}.shot-frame svg{width:35px;height:35px;stroke-width:1}.shot-frame span{position:absolute;left:12px;top:10px;font-size:11px;color:var(--muted)}.shot-body{padding:17px}.shot-body h3{font-size:13px;margin:0 0 13px}.shot-body p{font-size:11px;line-height:1.9;color:var(--muted);white-space:pre-wrap;max-height:160px;overflow:auto}.shot-body textarea{font-size:12px;padding:10px;width:100%;background:var(--surface);border:1px solid var(--line);border-radius:5px;color:var(--ink);min-height:70px}.shot-body select{background:var(--field-bg);color:var(--muted);border:1px solid var(--line);border-radius:4px;padding:6px;font-size:11px;margin-bottom:13px}\r\ndialog{width:min(610px,calc(100vw - 28px));max-height:90vh;overflow:auto;background:var(--field-bg);color:var(--ink);border:1px solid var(--line);border-radius:12px;padding:0;box-shadow:0 30px 100px rgba(80,90,120,.12)}dialog::backdrop{background:var(--surface);backdrop-filter:blur(2px)}.dialog-head{display:flex;align-items:center;justify-content:space-between;padding:22px 25px;border-bottom:1px solid var(--line)}.dialog-head h2{font-size:18px;margin:0;font-weight:600}.dialog-body{padding:24px 25px;line-height:1.8}.dialog-body p{font-size:12px;color:var(--muted);margin:0 0 18px}.dialog-body .notice{font-size:12px}.dialog-body code{font-size:11px;color:var(--accent-deep);background:var(--field-bg);padding:2px 5px;border-radius:3px;overflow-wrap:anywhere}.dialog-body .field{margin-bottom:20px}.dialog-body .field label{color:var(--muted)}.dialog-body .field:last-child{margin-bottom:0}.dialog-foot{border-top:1px solid var(--line);padding:18px 25px;display:flex;justify-content:flex-end;gap:10px}.dialog-foot .left{margin-right:auto}.dialog-foot .button{font-size:12px}.check-option{display:flex;gap:10px;align-items:center;font-size:13px;color:var(--ink);margin:12px 0}.check-option input{accent-color:var(--accent-deep)}.error{color:var(--danger)!important}.preview{white-space:pre-wrap;word-break:break-word;background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:16px;max-height:350px;overflow:auto;font:12px/1.9 \"Microsoft YaHei\",sans-serif;color:var(--muted)}.busy{text-align:center;padding:20px}.spinner{height:32px;width:32px;border-radius:50%;border:2px solid var(--line);border-top-color:var(--line);margin:10px auto 22px;animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}#toast{position:fixed;z-index:100;left:50%;bottom:24px;transform:translate(-50%,12px);background:var(--field-bg);color:var(--muted);border:1px solid var(--line);border-radius:7px;padding:12px 19px;font-size:12px;line-height:1.7;max-width:min(620px,90vw);opacity:0;pointer-events:none;box-shadow:0 8px 35px rgba(80,90,120,.12);transition:.2s}#toast.visible{opacity:1;transform:translate(-50%,0)}.locale-note{font-size:10px;color:var(--muted)}.backup-buttons{display:flex;gap:10px;flex-wrap:wrap}.search{max-width:420px;min-width:180px}.version-current-label{color:var(--accent-deep);font-size:10px;border:1px solid var(--line);padding:1px 5px;border-radius:3px}\r\n@media(min-width:1650px){.project-header{height:80px;padding:0 38px}.module-nav{height:60px}.panel-heading{height:98px;padding:23px 32px}.form-scroll{padding:34px 32px}.field input,.field textarea{font-size:16px}.field label{font-size:15px}.field textarea{min-height:112px}.field textarea.large{min-height:195px}.tree-button{font-size:16px}.editor-footer{min-height:76px}.button{font-size:15px}.footer-note{font-size:13px}.module-link{font-size:18px}}\r\n@media(max-width:1100px){.rail{padding-top:16px}.logo{width:34px;height:34px;padding:8px;gap:3px;border-radius:9px}.rail-nav{gap:17px;margin-top:25px}.rail-link{font-size:11px;gap:7px}.rail-link svg{width:19px;height:19px}.language{font-size:10px}.project-header{height:55px;padding:0 20px;gap:8px}.breadcrumb{gap:10px}.breadcrumb .crumb{font-size:12px}.breadcrumb strong{font-size:14px;max-width:180px}.badge{font-size:10px;padding:3px 8px}.header-actions{gap:8px}.header-actions .button{padding:7px 10px;font-size:11px;border-radius:5px}.header-actions .button svg{width:14px;height:14px}.user-menu{gap:6px;padding:3px 7px 3px 3px}.user-menu strong{font-size:11px}.user-menu small{font-size:8px}.user-menu .user-avatar{height:25px;width:25px;font-size:10px}.module-nav{height:40px;padding:0 14px;gap:4px}.module-link{font-size:12px;padding:0 12px;gap:6px}.module-link svg{width:16px;height:16px}.section-tree{padding:22px 10px}.tree-title{padding:0 8px 21px;gap:9px}.tree-title strong{font-size:14px}.tree-title svg{width:19px;height:19px}.tree-status{font-size:10px;margin-top:5px}.tree-button{font-size:12px;padding:13px 10px}.panel-heading{height:70px;padding:15px 22px}.panel-heading h1{font-size:15px;margin-bottom:5px}.save-state{font-size:10px}.panel-heading .button{font-size:11px;padding:9px 11px}.form-scroll{padding:24px 22px}.field{margin-bottom:18px}.field label{font-size:11px;margin-bottom:8px}.field input,.field textarea,.input{font-size:12px;padding:11px 12px;min-height:39px}.field textarea{min-height:84px}.field textarea.large{min-height:140px}.field textarea.tall{min-height:190px}.editor-footer{min-height:54px;padding:10px 16px;gap:10px}.footer-note{font-size:10px;gap:8px}.footer-note svg{width:13px;height:13px;margin-top:2px}.footer-actions{gap:5px}.footer-actions .button{font-size:11px;padding:8px 11px}.record-card{padding:18px}.record-name{font-size:14px}.version-sidebar{width:240px;padding:20px 12px}.version-title strong{font-size:14px}.version-title .button{padding:7px;font-size:10px}.full-scroll{padding:24px}.read-content{padding:20px 25px}.reading-scene p{font-size:13px}.export-card header{padding:20px}.export-card .card-body{padding:20px}.button{font-size:12px}.script-block>textarea{font-size:13px}.script-tools .button{font-size:10px}.script-tree .tree-button{font-size:11px}.script-tree .tree-button strong{font-size:12px}}\r\n@media(max-width:760px){:host{--rail-width:58px;--tree-width:158px}.rail{padding-left:4px;padding-right:4px}.header-actions .user-menu{display:none}.breadcrumb .crumb{display:none}.project-header{padding:0 13px}.breadcrumb{gap:6px}.breadcrumb strong{max-width:160px}.header-actions{gap:6px}.header-actions .button{font-size:10px;padding:7px}.module-nav{padding:0 4px;gap:0}.module-link{padding:0 11px;font-size:11px}.module-link svg{width:14px;height:14px}.section-tree{padding:20px 7px}.tree-title{padding-left:4px;gap:6px}.tree-title strong{font-size:13px}.tree-button{padding:14px 8px;font-size:11px}.form-scroll{padding:21px 17px}.panel-heading{padding:15px 17px}.footer-note{font-size:9px}.editor-footer{align-items:center}.footer-actions .icon-button{display:none}.row{grid-template-columns:1fr;gap:0}.field textarea.large{min-height:165px}.record-card{padding:14px}.record-top{gap:7px}.duration{font-size:10px}.duration input{width:36px}.version-sidebar{width:210px}.version-title{flex-wrap:wrap;gap:8px}.version-item{padding:14px 10px}.script-tools{gap:4px}.panel-heading .script-tools .button{padding:7px;font-size:9px}.script-tools .button svg{width:12px}.scene-blocks{padding:12px}.script-block.dialogue{padding-left:15px}.scene-top{padding:10px;flex-wrap:wrap}.scene-top input[type=text]{width:100%;flex-basis:70%}.full-scroll{padding:23px 19px}.entity-grid{grid-template-columns:1fr}.library-tools{flex-wrap:wrap;justify-content:flex-end}.library-top{gap:12px}.library-top h1{font-size:21px}}\r\n@media(max-width:560px){:host{--rail-width:0px}.rail{display:none}.project-header{height:60px;padding:0 12px}.breadcrumb .badge{display:none}.breadcrumb strong{max-width:125px;font-size:13px}.header-actions .button{padding:7px 8px;font-size:10px}.module-nav{height:44px;justify-content:space-between;padding:0 5px}.module-link{padding:0 10px;gap:4px;font-size:11px}.module-link svg{display:none}.module-body.bible-layout{flex-direction:column}.section-tree.bible-tree{width:100%;border-right:0;border-bottom:1px solid var(--line);padding:8px;display:flex;flex-direction:row;gap:4px;overflow-x:auto;flex-shrink:0;background:var(--surface)}.bible-tree .tree-title{display:none}.bible-tree .tree-button{padding:10px 11px;white-space:nowrap;width:auto;flex-shrink:0;font-size:11px}.bible-tree .tree-button>span:last-child{display:none}.panel-heading{height:72px;padding:15px 17px}.panel-heading h1{font-size:16px}.form-scroll{padding:22px 17px}.field label{font-size:12px}.field input,.field textarea{font-size:14px;padding:12px;min-height:44px}.field textarea{min-height:130px}.field textarea.large{min-height:220px}.field textarea.tall{min-height:230px}.editor-footer{padding:11px 14px;align-items:center;gap:10px}.footer-note{font-size:9px;line-height:1.65}.footer-note svg{display:none}.footer-actions .button{font-size:10px;padding:9px 10px}.row .field{margin-bottom:18px}.record-name{font-size:15px}.record-card{padding:15px;margin-bottom:18px}.record-top{margin-bottom:18px;padding-bottom:14px}.version-sidebar{width:100%;max-height:190px;border-right:0;border-bottom:1px solid var(--line);padding:14px}.version-title{margin-bottom:10px;flex-wrap:nowrap}.version-title .button{font-size:11px}.version-list{display:flex;overflow:auto;gap:10px}.version-item{min-width:195px;margin-bottom:0}.version-sidebar>p,.version-count{display:none}.module-body.version-layout{flex-direction:column}.read-content{padding:18px}.reading-episode h2{font-size:15px}.reading-scene p{font-size:13px}.full-scroll{padding:23px 16px}.export-card header{padding:18px}.export-card header strong{font-size:15px}.export-card header small{font-size:11px}.export-card .card-body{padding:18px}.export-card p{font-size:12px}.segment{font-size:11px;padding:9px 12px}.library-top{align-items:center}.library-top h1{font-size:22px}.entity-tabs{gap:6px}.entity-tabs button{font-size:11px;padding:8px 11px}.library-tools .button{font-size:10px;padding:7px}.entity-grid{gap:16px}.module-body.script-layout{flex-direction:column}.script-tree{width:100%;padding:9px;border:0;border-bottom:1px solid var(--line);display:flex;gap:6px;overflow-x:auto;flex-shrink:0}.script-tree .tree-title{display:none}.script-tree .tree-button{min-width:132px;width:auto;padding:9px 12px;gap:2px}.script-tree .tree-button small{display:none}.script-tree .button{margin:0;width:auto;align-self:center;white-space:nowrap}.script-tools .button span.optional{display:none}.scene-top{gap:5px}.scene-top input[type=text]{font-size:12px}.scene-blocks{padding:8px 10px}.script-block{padding-right:20px}.script-block.dialogue{padding-left:10px}.script-block>textarea{font-size:13px}.speaker-row{flex-wrap:wrap;gap:5px}.speaker-row input{font-size:11px;width:100%}.block-tools .button{font-size:10px;padding:7px 10px}.dialog-head{padding:19px 20px}.dialog-body{padding:20px}.dialog-foot{padding:15px 20px}.project-grid{grid-template-columns:1fr}.production-grid{grid-template-columns:1fr}.project-header .icon-button{width:24px;padding:3px}}\r\n@media(max-height:650px) and (min-width:561px){.rail-nav{gap:12px;margin-top:22px}.rail-link{padding:5px 0}.editor-footer{min-height:52px}.form-scroll{padding-top:22px}.panel-heading{height:68px}.rail{padding-bottom:9px}}\r\n.script-block>[data-block-delete]{position:absolute;right:-4px;top:4px;opacity:.2}.script-block:hover>[data-block-delete]{opacity:1}.rail-link>span{white-space:nowrap}.editor-panel,.reading-panel{min-height:0}.workspace{height:100dvh}\r\n@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}}\r\n\r\n/* DeepSeek settings and complete creation workflow */\r\n#dialog[open]{display:flex;flex-direction:column;overflow:hidden;max-height:90dvh}#dialog .dialog-head,#dialog .dialog-foot{flex-shrink:0}#dialog .dialog-body{min-height:0;overflow-y:auto}#dialog .dialog-foot{flex-wrap:wrap}\r\n.workflow-steps{display:grid;gap:18px}.workflow-steps>div{padding:18px;border:1px solid var(--line);border-radius:10px}.workflow-steps p{margin:8px 0 14px;color:var(--muted);line-height:1.7}.workflow-steps .button{margin:3px 6px 3px 0}.panel-heading .button+.button{margin-left:8px}.shot-body>.button{margin-top:12px}.library-tools{flex-wrap:wrap}#model-feedback{line-height:1.7}#deepseek-key{font-family:monospace}#dialog{max-height:90dvh}.dialog-body{overflow:auto}.header-actions{flex-wrap:wrap}.shot-body textarea{min-height:180px}\r\n@media(max-width:760px){.project-header{height:auto;min-height:72px;gap:10px;flex-wrap:wrap;padding:10px}.header-actions{gap:6px}.panel-heading{height:auto;min-height:72px;gap:10px;flex-wrap:wrap}.panel-heading .button{font-size:11px;padding:8px}.library-top{flex-wrap:wrap;gap:12px}}\r\n\r\n.script-empty-state{padding:26px;margin:0 0 24px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);font:14px/1.7 \"Microsoft YaHei\",sans-serif;text-align:left}.script-empty-state strong{display:block;font-size:17px}.script-empty-state p{margin:10px 0 16px;color:var(--ink)}.script-empty-state small{display:block;margin-top:12px;color:var(--muted)}.script-empty-state .button{font-size:14px}.editor-footer .footer-actions{flex-wrap:wrap}.editor-footer .footer-note{flex:1;min-width:0}@media(max-width:760px){.editor-footer .footer-note{display:none}.editor-footer .footer-actions{width:100%;justify-content:flex-end}}\r\n\n/* Screenplay document layout; the shared application shell is styled in styles.css. */\r\n.workspace:has(.screenplay-layout),.workspace:has(.version-workspace){--script-muted:#777}\r\n\r\n.script-nav-actions{display:flex;align-items:center;gap:5px;flex:1;min-width:200px}\r\n.script-nav-actions .button{align-self:center;font-size:11px;padding:7px 10px;border-radius:5px}\r\n.script-nav-actions [data-script-save]{color:var(--muted);background:var(--surface);border-color:var(--line)}\r\n.script-nav-actions .icon-button{width:25px;font-size:18px}\r\n.script-nav-actions .parse-script{margin-left:auto;background:var(--field-bg);font-weight:600}\r\n.screenplay-layout{background:var(--surface);position:relative;flex-direction:row!important}\r\n.scene-directory{width:200px;flex-shrink:0;background:var(--surface);border-right:1px solid var(--line);display:flex;flex-direction:column;min-height:0}\r\n.scene-directory>header{height:44px;flex-shrink:0;padding:0 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);font-size:13px}\r\n.scene-directory>header small{font-size:10px;font-weight:400;margin-left:5px;color:var(--muted)}\r\n.directory-add{background:var(--field-bg);border-radius:5px;height:30px;width:30px;font-size:20px;color:var(--muted)}\r\n.scene-index{flex:1;overflow:auto;padding:8px 8px 22px}\r\n.scene-index section{margin-bottom:25px}\r\n.scene-index h3{margin:14px 12px 7px;font-size:11px;line-height:1.5;color:var(--muted);font-weight:600}\r\n.scene-index-row{display:flex;border:1px solid transparent;border-radius:7px;position:relative;margin-bottom:5px;align-items:stretch;min-height:56px}\r\n.scene-index-row.active{background:var(--field-bg);border-color:var(--line)}\r\n.scene-jump{display:flex;align-items:flex-start;gap:10px;text-align:left;padding:10px 8px;line-height:1.7;flex:1;min-width:0;font-size:12px}\r\n.scene-jump>span{font-size:10px;color:var(--ink);padding-top:2px;flex-shrink:0}\r\n.scene-jump>strong{font-weight:550;overflow-wrap:anywhere}\r\n.scene-index-actions{display:flex;flex-direction:column;width:19px;justify-content:center;opacity:0;flex-shrink:0;gap:3px}\r\n.scene-index-actions input{width:11px;height:11px;margin:0;accent-color:var(--accent-deep)}\r\n.scene-index-row:hover .scene-index-actions,.scene-index-row:focus-within .scene-index-actions,.scene-index-row:has(input:checked) .scene-index-actions{opacity:1}\r\n.scene-delete{font-size:12px;padding:0;color:var(--muted);width:13px}\r\n.scene-directory footer{padding:14px 12px;font-size:10px;color:var(--muted);border-top:1px solid var(--line);flex-shrink:0}\r\n.add-episode{width:100%;font-size:11px;color:var(--muted);padding:10px}\r\n.continuous-panel{display:flex;flex-direction:column;flex:1;min-width:0;min-height:0}\r\n.screenplay-toolbar{height:44px;flex-shrink:0;border-bottom:1px solid var(--line);background:var(--surface);display:flex;align-items:center;padding:0 20px;gap:15px}\r\n.screenplay-location{flex:1;min-width:0}\r\n.screenplay-location>div{display:flex;align-items:center;gap:8px;min-width:0}\r\n.current-scene-label{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\r\n.focus-toggle{font-size:11px;color:var(--muted);white-space:nowrap;padding:0;flex-shrink:0}\r\n.screenplay-location small{display:block;color:var(--muted);font-size:10px;line-height:1.8}\r\n.screenplay-format{display:flex;align-items:center;gap:9px;flex-shrink:0;font-size:10px;color:var(--muted)}\r\n.screenplay-format [role=group]{display:flex;background:var(--surface);border-radius:5px;padding:3px}\r\n.screenplay-format button{font-size:10px;color:var(--muted);padding:6px 9px;border-radius:4px;white-space:nowrap}\r\n.screenplay-format button.active{background:var(--field-bg);border:1px solid var(--line);color:var(--ink);padding:5px 8px;font-weight:600}\r\n.coauthor-toggle{display:none;font-size:11px;white-space:nowrap;color:var(--muted);padding:5px}\r\n.screenplay-layout:not(.with-copilot) .coauthor-toggle{display:block}\r\n.directory-toggle{display:none;font-size:14px;color:var(--muted);padding:2px}\r\n.continuous-scroll{flex:1;min-height:0;overflow:auto;padding:12px 16px 0;scrollbar-gutter:stable}\r\n.screenplay-paper{min-height:100%;max-width:1040px;margin:0 auto;background:linear-gradient(var(--surface),var(--surface) 420px);padding:30px 50px 100px 90px;color:var(--ink);font-size:14px;line-height:1.9}\r\n.episode-cover{text-align:center;padding:18px 0 16px;margin-bottom:0;border-bottom:1px solid var(--line)}\r\n.episode-cover>div{font-size:13px;font-weight:600;margin-bottom:5px}\r\n.episode-cover h1{font-size:25px;line-height:1.5;margin:0;font-weight:750;letter-spacing:.5px}\r\n.screenplay-episode+.screenplay-episode{margin-top:85px}\r\n.screenplay-scene{scroll-margin-top:20px}\r\n.screenplay-heading{font-size:14px;line-height:1.8;font-weight:650;margin:0 0 22px;padding:26px 0 17px;border-bottom:1px solid var(--line)}\r\n.script-edit{outline:none!important;border-radius:2px;min-width:1ch;white-space:pre-wrap;overflow-wrap:anywhere}\r\n.script-edit:focus{background:var(--field-bg);box-shadow:0 1px 0 rgba(80,90,120,.12)!important}\r\n.script-edit:empty:before{content:' ';white-space:pre}\r\n.screenplay-heading .script-edit,.screenplay-row>.script-edit{display:block;min-height:1.8em}\r\n.screenplay-row{position:relative;margin:14px 0;min-height:1.9em}\r\n.paragraph-tools{position:absolute;right:calc(100% + 8px);top:0;display:flex;align-items:center;gap:2px;background:var(--surface);padding:2px;border:1px solid var(--line);border-radius:4px;opacity:0;z-index:3;pointer-events:none;transition:opacity .12s}\r\n.screenplay-row:hover .paragraph-tools,.screenplay-row:focus-within .paragraph-tools{opacity:1;pointer-events:auto}\r\n.drag-block{font-size:17px;color:var(--muted);cursor:grab;padding:0 3px}\r\n.paragraph-tools select{font-size:10px;width:66px;padding:4px 2px;background:var(--field-bg);border:0;color:var(--muted)}\r\n.screenplay-dialogue .speaker{font-weight:650}\r\n.screenplay-dialogue .parenthetical{font-size:13px;color:var(--muted)}\r\n.screenplay-dialogue .parenthetical:not(:empty):before{content:'（'}\r\n.screenplay-dialogue .parenthetical:not(:empty):after{content:'）'}\r\n.screenplay-dialogue .parenthetical:empty:not(:focus){display:inline-block;min-width:2px;max-width:2px}\r\n.screenplay-dialogue .parenthetical:focus:empty:before{content:'括注';color:var(--muted)}\r\n.screenplay-dialogue .speaker:empty:before{content:'角色';color:var(--muted)}\r\n.scene-insert{height:0;position:relative;text-align:right}\r\n.insert-paragraph{opacity:0;font-size:10px;color:var(--muted);background:var(--field-bg);border:1px solid var(--line);border-radius:4px;padding:3px 7px;position:relative;top:-8px}\r\n.screenplay-scene:hover .insert-paragraph,.insert-paragraph:focus-visible{opacity:1}\r\n.type-transition{text-align:right}.type-comment{color:var(--muted);font-style:italic}.type-subtitle{text-align:center}.type-character{font-weight:650}.type-parenthetical{color:var(--muted)}\r\n.format-hollywood .screenplay-dialogue{max-width:390px;margin:22px auto}\r\n.format-hollywood .screenplay-dialogue .speaker{display:block;text-align:center}\r\n.format-hollywood .screenplay-dialogue .parenthetical{display:block;text-align:center;min-width:0;max-width:none}\r\n.format-hollywood .screenplay-dialogue .parenthetical:empty{display:none}\r\n.format-hollywood .dialogue-colon{display:none}.format-hollywood .dialogue-text{display:block}\r\n.format-hollywood .type-character{text-align:center}.format-hollywood .type-parenthetical{max-width:280px;margin-left:auto;margin-right:auto}\r\n.coauthor-panel{width:270px;flex-shrink:0;border-left:1px solid var(--line);background:var(--surface);display:flex;flex-direction:column;min-height:0;overflow:auto}\r\n.coauthor-panel>header{height:44px;flex-shrink:0;display:flex;justify-content:space-between;align-items:center;padding:0 15px;border-bottom:1px solid var(--line);font-size:13px}\r\n.panel-close{font-size:20px;color:var(--muted);opacity:0}.coauthor-panel:hover .panel-close{opacity:1}\r\n.coauthor-conversation{padding:35px 18px 25px;text-align:center;font-size:12px;line-height:1.8;border-bottom:1px solid var(--line);min-height:130px;max-height:40%;overflow:auto;flex-shrink:0}\r\n.coauthor-conversation>strong{font-size:13px}.coauthor-conversation p{color:var(--muted);margin:8px 0 0;font-size:12px}\r\n.coauthor-reply{text-align:left;white-space:pre-wrap;color:var(--ink)}\r\n.coauthor-review{display:grid;gap:8px;margin-top:14px;font-size:11px;color:var(--muted)}\r\n.coauthor-controls{padding:12px;display:flex;flex-direction:column;gap:9px;font-size:11px}\r\n.coauthor-tasks{display:grid;grid-template-columns:1fr 1fr;gap:5px}\r\n.coauthor-tasks button{padding:9px;background:var(--surface);border:1px solid var(--line);border-radius:5px;font-size:12px}\r\n.coauthor-tasks button.active{border-color:var(--line);background:var(--field-bg);box-shadow:0 0 0 1px rgba(80,90,120,.12)}\r\n.coauthor-scope{display:flex;justify-content:space-between;align-items:center;color:var(--muted);margin-top:3px}\r\n.coauthor-scope select{max-width:130px;font-size:11px;border:0;border-radius:4px;padding:7px 3px;background:var(--field-bg)}\r\n.coauthor-controls p{margin:0;line-height:1.65;color:var(--muted);font-size:10px}\r\n.coauthor-controls label[for]{margin-top:5px;color:var(--ink)}\r\n.coauthor-controls textarea{width:100%;min-height:82px;border:1px solid var(--line);border-radius:5px;background:var(--surface);padding:10px;line-height:1.6;font-size:12px;resize:vertical}\r\n.coauthor-send{width:100%;padding:9px!important;font-size:12px!important;border-radius:5px!important}\r\n.block-menu-options{display:flex;gap:8px;flex-wrap:wrap}\r\n.screenplay-layout.focus-mode .scene-directory,.screenplay-layout.focus-mode .coauthor-panel{display:none}\r\n.screenplay-layout.focus-mode .coauthor-toggle{display:none}.screenplay-layout.focus-mode .screenplay-paper{max-width:1000px}\r\n.version-workspace{background:var(--surface);flex-direction:row}\r\n.history-sidebar{width:260px;flex-shrink:0;background:var(--surface);border-right:1px solid var(--line);display:flex;flex-direction:column;min-height:0}\r\n.history-sidebar>header{height:58px;padding:0 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-shrink:0}\r\n.history-sidebar>header strong{font-size:13px}.history-sidebar>header .button{font-size:10px;padding:6px 8px;border-radius:5px}\r\n.history-list{flex:1;overflow:auto}\r\n.history-item{display:flex;flex-direction:column;width:100%;gap:8px;padding:14px 16px;text-align:left;border-left:2px solid transparent;border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-bottom:6px;background:var(--surface);color:var(--ink)}\r\n.history-item.active{background:var(--surface);border-left-color:var(--line)}\r\n.history-item:hover{background:var(--field-bg)}.history-item strong{font-size:12px;font-weight:600;line-height:1.6;overflow-wrap:anywhere}\r\n.history-item strong>span{font-size:9px;color:var(--accent-deep);background:var(--surface-active);border-radius:3px;padding:2px 5px;margin-left:7px;font-weight:400}\r\n.history-item time{font-size:10px;color:var(--muted)}.history-item em{font-size:10px;color:var(--muted);line-height:1.6}\r\n.history-empty{border:1px solid var(--line);border-radius:5px;background:var(--surface);color:var(--muted);font-size:11px;line-height:1.9;padding:13px;margin:15px}\r\n.history-sidebar>footer{padding:14px;font-size:10px;color:var(--muted);border-top:1px solid var(--line);flex-shrink:0}\r\n.version-reader{display:flex;flex-direction:column;flex:1;min-width:0;min-height:0}\r\n.version-reader>header{display:flex;align-items:center;gap:14px;min-height:43px;padding:9px 20px;border-bottom:1px solid var(--line);background:var(--surface);flex-shrink:0;flex-wrap:wrap}\r\n.version-reader>header strong{font-size:12px;font-weight:600}.version-reader>header span{color:var(--muted);font-size:10px}\r\n.version-reader>header .button{margin-left:auto;padding:5px 8px;font-size:10px}\r\n.version-document{flex:1;min-height:0;overflow:auto;padding:30px 40px 80px;font-size:13px;line-height:1.9;color:var(--muted)}\r\n.version-episode{max-width:1100px;margin:0 0 38px}\r\n.version-episode>h2{font-size:13px;font-weight:650;color:var(--ink);margin:0 0 24px;border:0;padding:0}\r\n.version-scene{margin-bottom:26px}.version-scene>h3{color:var(--accent-deep);font-size:11px;font-weight:400;margin:0 0 18px;background:none;border:0;padding:0}\r\n.version-scene p{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;font-weight:400;line-height:1.9;margin:0 0 22px}\r\n.version-block{margin:0}.version-block p:last-child{margin-bottom:22px}\r\n@media(min-width:1650px){.scene-directory{width:250px}.coauthor-panel{width:320px}.screenplay-paper{font-size:16px}.screenplay-heading{font-size:16px}.scene-jump{font-size:14px}.history-sidebar{width:300px}.version-document{padding:36px 45px}.version-scene p{font-size:15px}}\r\n@media(max-width:1199px){.coauthor-panel{display:none;position:absolute;right:0;top:44px;bottom:0;z-index:12;box-shadow:-12px 0 40px rgba(80,90,120,.12)}.screenplay-layout.with-copilot .coauthor-panel{display:flex}.coauthor-toggle{display:block}.screenplay-layout.with-copilot .coauthor-panel{width:270px}.screenplay-layout.with-copilot .continuous-panel{margin-right:270px}.scene-directory{width:180px}.screenplay-toolbar{padding:0 14px;gap:9px}.screenplay-format>span{display:none}.focus-mode .continuous-panel{margin-right:0!important}.screenplay-paper{padding-left:48px;padding-right:38px}.script-nav-actions .icon-button{display:none}}\r\n@media(max-width:1000px){.scene-directory{display:none}.directory-toggle{display:block}.screenplay-layout.directory-open .scene-directory{display:flex;position:absolute;left:0;top:44px;bottom:0;z-index:13;box-shadow:12px 0 25px rgba(80,90,120,.12)}.screenplay-layout.with-copilot .continuous-panel{margin-right:0}.screenplay-layout.with-copilot .coauthor-panel{display:none}.screenplay-layout.with-copilot:has(.coauthor-toggle[aria-expanded=true]):focus-within .coauthor-panel{display:none}.coauthor-panel.mobile-open{display:flex!important;top:44px;width:280px}.screenplay-format button{font-size:10px;padding:5px 8px}.screenplay-format button.active{padding:4px 7px}.screenplay-paper{padding-left:70px;padding-right:40px}.history-sidebar{width:260px}.script-nav-actions{min-width:230px}.script-nav-actions .button{font-size:11px;padding:7px 9px}}\r\n@media(max-width:760px){.screenplay-toolbar{padding:0 18px;gap:8px}.screenplay-location small{font-size:10px}.current-scene-label{font-size:12px}.focus-toggle{font-size:10px}.episode-cover h1{font-size:24px}.screenplay-paper{padding-top:42px;font-size:13px}.screenplay-heading{font-size:13px}.screenplay-format{gap:4px}.coauthor-toggle{font-size:10px;padding:0}.history-sidebar{width:230px}.version-document{padding:28px 30px}.version-reader>header{padding-left:16px;gap:6px}.version-reader>header span{font-size:9px}.version-scene p{font-size:12px}.paragraph-tools{right:calc(100% + 2px)}.paragraph-tools select{width:48px}.screenplay-location .directory-toggle{display:none}}\r\n@media(max-width:560px){.screenplay-toolbar{height:70px;flex-wrap:wrap;padding:7px 12px;gap:5px}.screenplay-location{flex-basis:100%;display:flex;justify-content:space-between;align-items:center}.screenplay-location small{display:none}.screenplay-location>div{width:100%}.focus-toggle{margin-left:auto}.screenplay-format{margin-left:auto}.screenplay-location .directory-toggle{display:block}.coauthor-toggle{margin-left:8px}.continuous-scroll{padding:0 6px}.screenplay-paper{padding:22px 27px 80px}.episode-cover h1{font-size:21px}.paragraph-tools{right:0;top:-22px}.screenplay-heading{padding-top:20px}.screenplay-layout.directory-open .scene-directory,.coauthor-panel.mobile-open{top:70px}.version-workspace{flex-direction:column}.history-sidebar{width:100%;height:170px;border-right:0;border-bottom:1px solid var(--line)}.history-sidebar>header{height:40px}.history-list{display:flex;padding:0 8px;gap:7px}.history-item{min-width:190px;width:190px;padding:8px 12px;gap:5px;margin-bottom:8px;border:1px solid var(--line);border-left:2px solid transparent;border-radius:4px}.history-item.active{border-left-color:var(--line)}.history-sidebar>footer{display:none}.history-empty{margin:3px;min-width:180px}.version-document{padding:22px 20px}.version-reader>header{padding:9px 16px}.version-reader>header span{margin-left:auto}.script-nav-actions{min-width:205px}.script-nav-actions .parse-script{font-size:10px}.screenplay-paper.format-hollywood .screenplay-dialogue{max-width:230px}.screenplay-paper .script-edit{font-size:inherit}}\r\n@media(max-width:560px){.script-nav-actions{min-width:210px}.coauthor-panel.mobile-open .panel-close{opacity:1}.screenplay-layout.with-copilot:has(.coauthor-toggle[aria-expanded=true]):focus-within .coauthor-panel.mobile-open{display:flex}}\r\n\n:host{--fusion-accent:#a7d9bf}.fusion-section-intro{padding:4px 0 20px;color:var(--muted);font-size:13px;line-height:1.8}.fusion-label{font-size:11px;letter-spacing:2px;color:var(--fusion-accent)}.fusion-section-intro p{margin-top:8px}.fusion-people{display:flex}.fusion-people .editor-panel{flex:1;min-width:0}.fusion-roster{width:270px;overflow:auto;border-left:1px solid var(--line);background:var(--surface);padding:24px 18px}.fusion-roster-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}.fusion-person{display:grid;grid-template-columns:40px 1fr;gap:6px 12px;width:100%;text-align:left;border:1px solid var(--line);background:var(--field-bg);color:var(--ink);border-radius:10px;margin-bottom:12px;padding:16px}.fusion-person.active{border-color:var(--line);background:var(--field-bg)}.fusion-initial{grid-row:span 2;display:grid;place-items:center;border-radius:9px;background:var(--field-bg);color:var(--ink);font-size:20px;width:40px;height:44px}.fusion-person small{color:var(--muted);font-size:11px}.fusion-person>div{grid-column:1/-1;margin-top:6px;display:flex;gap:5px;flex-wrap:wrap}.fusion-person>div span,.fusion-tags span{border:1px solid var(--line);background:var(--field-bg);color:var(--ink);border-radius:12px;padding:3px 8px;font-size:11px}.fusion-tags{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}.fusion-detail{margin-top:22px;border-top:1px solid var(--line);padding-top:18px}.fusion-detail summary{color:var(--ink);margin-bottom:20px;cursor:pointer}.fusion-board-layout{display:flex}.fusion-board-main{flex:1;min-width:0}.fusion-board-settings{display:flex;gap:22px;align-items:center;padding:16px 20px;background:var(--field-bg);border:1px solid var(--line);border-radius:10px;margin:22px 0}.fusion-board-settings .field{margin:0;min-width:140px}.fusion-board-settings .field:first-child{flex:1}.fusion-stats{font-size:13px;color:var(--muted);white-space:nowrap;padding-top:23px}.fusion-stats strong{font-size:22px;color:var(--ink);margin-right:5px}.fusion-stats span{margin:0 8px}.fusion-board-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin-top:22px}.fusion-shot{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--field-bg)}.fusion-shot>header{display:flex;gap:12px;align-items:center;padding:18px;background:var(--field-bg);border-bottom:1px solid var(--line)}.fusion-shot>header>div{flex:1;min-width:0}.fusion-shot>header strong{font-size:15px;line-height:1.6;display:block}.fusion-shot>header small{display:block;color:var(--muted);margin-top:5px;font-size:11px}.fusion-shot-number{font-size:26px;color:var(--accent-deep);font-variant-numeric:tabular-nums}.fusion-shot-time{display:flex;align-items:center;gap:5px;white-space:nowrap;color:var(--muted);font-size:12px}.fusion-shot-time input{width:56px;padding:6px!important;background:var(--surface)!important}.fusion-shot-content{padding:18px}.fusion-shot .field textarea{min-height:180px;line-height:1.9;font-size:13px;resize:vertical}.fusion-source{font-size:12px;color:var(--muted);line-height:1.8;margin:16px 0;border-left:2px solid var(--line);padding-left:12px}.fusion-shot details{border-top:1px solid var(--line);padding:14px 0}.fusion-shot summary{cursor:pointer;color:var(--ink);font-size:13px;margin-bottom:12px}.fusion-footnote{margin:24px 0;color:var(--muted);font-size:12px}.fusion-board-main .library-tools{flex-wrap:wrap}.fusion-people .form-content{max-width:1000px}.fusion-people .editor-footer{flex-wrap:wrap;gap:10px}.fusion-roster-title strong{font-size:14px}.fusion-board-layout .tree-button small{display:inline-block;margin-top:7px;color:var(--muted);font-size:11px}.fusion-board-settings select{min-width:120px}.panel-heading .button{margin-left:8px}@media(min-width:1750px){.fusion-board-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:1050px){.fusion-roster{width:220px}.fusion-board-grid{grid-template-columns:1fr}.fusion-board-settings{flex-wrap:wrap}.fusion-people .panel-heading{flex-wrap:wrap;height:auto;gap:10px;padding:20px}.fusion-stats{padding-top:0}}@media(max-width:700px){.fusion-people{flex-direction:column}.fusion-roster{width:100%;max-height:210px;border-left:0;border-top:1px solid var(--line);display:flex;gap:10px;flex-shrink:0;overflow:auto;padding:12px}.fusion-roster-title{display:none}.fusion-person{min-width:180px;width:180px;margin:0}.fusion-board-layout .section-tree{width:115px;min-width:115px}.fusion-board-main{padding:16px!important}.fusion-board-settings{padding:12px;gap:12px}.fusion-shot-time{display:none}.fusion-board-main .library-top{flex-wrap:wrap;gap:16px}}\r\n\r\n.fusion-timing-badge{display:block;width:fit-content;margin:10px 0 0!important;padding:4px 10px;border-radius:5px;font-size:12px;border:1px solid var(--line)}\r\n.fusion-timing-badge.matched{color:var(--accent-deep);background:var(--surface-active)}\r\n.fusion-timing-badge.mismatch{color:var(--danger);background:var(--surface-active);border-color:var(--line)}\r\n.fusion-timing-notice{display:flex;align-items:center;justify-content:space-between;gap:18px;font-size:14px;flex-wrap:wrap}\r\n.fusion-timing-notice>div{flex:1;min-width:200px}\r\n.fusion-source-label{display:block;color:var(--muted);font-size:12px;margin-bottom:8px}\r\n.fusion-shot-range{color:var(--ink)!important;font-variant-numeric:tabular-nums}\r\n.fusion-speech-note{font-size:12px;color:var(--muted);margin:-12px 0 22px;line-height:1.7}\r\n.fusion-speech-note.over-budget{color:var(--danger)}\r\n.fusion-shot .field textarea.compact{min-height:90px}\r\n.fusion-shot-time input{border:1px solid var(--line);border-radius:5px;color:var(--ink);font:inherit}\r\n.fusion-board-settings{flex-wrap:wrap}\r\n.fusion-board-main .library-top{align-items:flex-start;gap:16px;flex-wrap:wrap}\r\n.batch-banner{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;flex-shrink:0;padding:10px 22px;border-bottom:1px solid var(--line);background:var(--surface);color:var(--ink);font-size:14px;line-height:1.6}\r\n.batch-episodes{padding:0;list-style:none;margin:14px 0 20px}\r\n.batch-entry{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:12px;border:1px solid var(--line);border-radius:7px;margin:8px 0;font-size:14px}\r\n.batch-entry>div{flex:1;min-width:0}.batch-entry strong{display:block;font-size:14px;font-weight:550}.batch-entry small{display:block;margin-top:5px;font-size:12px;color:var(--muted)}\r\n.batch-entry>span{white-space:nowrap;font-size:12px;color:var(--muted)}.batch-entry.done>span{color:var(--accent-deep)}.batch-entry.failed>span{color:var(--danger)}.batch-entry.running{border-color:var(--line);background:var(--surface-active)}.batch-entry.running>span{color:var(--accent-deep)}\r\n.batch-entry p{color:var(--danger)!important;line-height:1.7;margin:8px 0 0!important;overflow-wrap:anywhere}.batch-progress{width:100%;height:12px;accent-color:var(--accent-deep)}.batch-plan-count{color:var(--ink)!important}\r\n.scene-directory footer .button{max-width:100%;white-space:normal}\r\n/* One type scale for all modules, independent of the imported module layouts. */\r\n:host {\r\n  --ui-body: 15px;\r\n  --ui-control: 14px;\r\n  --ui-meta: 12px;\r\n  --ui-heading: 20px;\r\n  --ui-section: 16px;\r\n  font-size: var(--ui-body);\r\n}\r\n.module-link { font-size: var(--ui-body); }\r\n.rail-link { font-size: var(--ui-meta); }\r\n.language, .badge, .user-menu small { font-size: var(--ui-meta); }\r\n.breadcrumb strong { font-size: 18px; }\r\n.breadcrumb .crumb { font-size: var(--ui-control); }\r\n.button, .button.small, .header-actions .button, .panel-heading .button,\r\n.footer-actions .button, .dialog-foot .button, .library-tools .button,\r\n.script-nav-actions .button, .history-sidebar>header .button,\r\n.version-reader>header .button, .segment, .user-menu strong {\r\n  font-size: var(--ui-control);\r\n}\r\n.module-nav { overflow-y: hidden; }\r\n.panel-heading h1, .library-top h1, .dialog-head h2 { font-size: var(--ui-heading); }\r\n.tree-title strong, .fusion-roster-title strong, .scene-directory>header,\r\n.coauthor-panel>header, .history-sidebar>header strong, .version-reader>header strong,\r\n.export-card header strong, .record-top h2 { font-size: var(--ui-section); }\r\n.record-top h2 { flex: 1; margin: 0; font-weight: 600; }\r\n.tree-button, .bible-tree .tree-button, .scene-jump, .scene-index h3,\r\n.history-item strong, .fusion-detail summary, .fusion-shot summary { font-size: var(--ui-control); }\r\n.field label, .coauthor-controls label[for] { font-size: var(--ui-control); }\r\n.field input, .field textarea, .field select, .input,\r\n.fusion-shot .field textarea, .coauthor-controls textarea,\r\n.screenplay-paper, .screenplay-heading, .version-document, .version-scene p,\r\n.reading-scene p, .export-card p, .fusion-source {\r\n  font-size: var(--ui-body);\r\n  line-height: 1.8;\r\n}\r\n.screenplay-dialogue .parenthetical { font-size: inherit; }\r\n.version-episode>h2 { font-size: var(--ui-heading); }\r\n.version-scene>h3 { font-size: var(--ui-section); }\r\n.current-scene-label, .coauthor-tasks button, .coauthor-conversation>strong,\r\n.coauthor-conversation p, .coauthor-conversation, .coauthor-scope select {\r\n  font-size: var(--ui-control);\r\n}\r\n.save-state, .tree-status, .footer-note, .library-top p,\r\n.scene-directory>header small, .scene-directory footer, .scene-jump>span,\r\n.history-item time, .history-item em, .history-item strong>span,\r\n.history-sidebar>footer, .version-reader>header span, .history-empty,\r\n.screenplay-location small, .screenplay-format, .screenplay-format button,\r\n.focus-toggle, .coauthor-toggle, .coauthor-controls p, .coauthor-review,\r\n.fusion-section-intro, .fusion-label, .fusion-person small, .fusion-person>div span,\r\n.fusion-tags span, .fusion-shot>header small, .fusion-shot-time,\r\n.fusion-footnote, .fusion-board-layout .tree-button small { font-size: var(--ui-meta); }\r\n.fusion-shot>header strong, .fusion-person>strong { font-size: var(--ui-section); }\r\n.fusion-stats, .add-episode, .insert-paragraph { font-size: var(--ui-control); }\r\n.coauthor-send { font-size: var(--ui-control)!important; }\r\n.coauthor-controls { font-size: var(--ui-control); gap: 12px; }\r\n.paragraph-tools select { font-size: var(--ui-meta); }\r\n.script-module-tools {\r\n  display: flex; flex-shrink: 0; min-height: 52px; padding: 8px 22px;\r\n  border-bottom: 1px solid var(--line); background:var(--surface); overflow-x: auto;\r\n}\r\n.script-nav-actions { min-width: max-content; gap: 10px; }\r\n.script-nav-actions .button { padding: 7px 12px; }\r\n.scene-directory>header, .coauthor-panel>header, .screenplay-toolbar { height: 54px; }\r\n.screenplay-toolbar { gap: 10px; }\r\n.screenplay-format button { padding: 6px 8px; }\r\n.screenplay-format button.active { padding: 5px 7px; }\r\n.coauthor-panel { width: 300px; }\r\n.history-sidebar>header { min-height: 66px; height: auto; flex-wrap: wrap; padding: 14px; }\r\n.fusion-people .editor-footer .button { flex-shrink: 0; }\r\n.bible-layout .panel-heading, .fusion-people .panel-heading { flex-wrap: wrap; height: auto; min-height: 98px; }\r\n.bible-layout .panel-heading>div:first-child, .fusion-people .panel-heading>div:first-child { margin-right: auto; }\r\n.bible-layout .panel-heading .button, .fusion-people .panel-heading .button { margin-left: 0; }\r\n.bible-layout .editor-footer { flex-wrap: wrap; }\r\n@media (max-width:1199px) {\r\n  .coauthor-panel { top: 54px; }\r\n  .screenplay-format>span { display: none; }\r\n}\r\n@media (max-width:1000px) {\r\n  .screenplay-layout.directory-open .scene-directory, .coauthor-panel.mobile-open { top: 54px; }\r\n}\r\n@media (max-width:760px) {\r\n  .project-header { height: auto; min-height: 72px; padding: 12px; }\r\n  .module-nav { height: 50px; }\r\n  .script-module-tools { padding: 8px 12px; }\r\n  .panel-heading { min-height: 86px; }\r\n}\r\n@media (max-width:560px) {\r\n  .breadcrumb strong { font-size: var(--ui-section); }\r\n  .module-nav { justify-content: flex-start; }\r\n  .screenplay-toolbar { height: 80px; }\r\n  .screenplay-layout.directory-open .scene-directory, .coauthor-panel.mobile-open { top: 80px; }\r\n  .history-sidebar>header { min-height: 48px; padding: 6px 12px; }\r\n}\r\n\r\n/* Story direction selection shares the editor's typography. */\r\n#dialog:has(.direction-grid) { width: min(1440px, 94vw); max-width: 94vw; }\r\n.direction-intro { margin-bottom: 22px; }\r\n.direction-intro>p:first-child { display:flex; flex-wrap:wrap; gap:12px; align-items:center; }\r\n.direction-intro>p:first-child span, .direction-intro>p { color:var(--muted); }\r\n.direction-intro strong { color:var(--ink); }\r\n.direction-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:18px; align-items:stretch; }\r\n.direction-card { min-width:0; display:flex; flex-direction:column; border:1px solid var(--line); background:var(--surface); border-radius:12px; overflow:hidden; }\r\n.direction-card.chosen { border-color:var(--line); }\r\n.direction-card>header { padding:20px 22px 16px; border-bottom:1px solid var(--line); background:var(--field-bg); }\r\n.direction-number { color:var(--muted); font-size:var(--ui-meta); display:flex; justify-content:space-between; gap:8px; }\r\n.direction-number span { color:var(--ink); }\r\n.direction-card h3 { font-size:var(--ui-heading); line-height:1.5; margin:10px 0 12px; overflow-wrap:anywhere; }\r\n.direction-tags { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px; }\r\n.direction-tags span { border:1px solid var(--line); color:var(--ink); border-radius:5px; padding:2px 7px; font-size:var(--ui-meta); }\r\n.direction-card p, .direction-copy { white-space:pre-wrap; overflow-wrap:anywhere; line-height:1.8; }\r\n.direction-card>header p { color:var(--ink); margin:0; }\r\n.direction-card>header .button { width:100%; justify-content:center; white-space:normal; margin-top:16px; }\r\n.direction-intro p, .direction-card p { font-size:var(--ui-body); }\r\n.direction-content { padding:18px 22px; flex:1; }\r\n.direction-logline { margin:0 0 18px; color:var(--ink); font-weight:600; }\r\n.direction-copy h4 { font-size:var(--ui-control); color:var(--muted); margin:16px 0 6px; }\r\n.direction-copy p { margin:0 0 12px; }\r\n.direction-grid details { border-top:1px solid var(--line); padding:12px 0; }\r\n.direction-grid summary, .direction-intro summary { cursor:pointer; color:var(--ink); line-height:1.8; }\r\n.direction-sample { font:inherit; white-space:pre-wrap; overflow-wrap:anywhere; line-height:1.9; background:var(--surface); padding:14px; border-radius:6px; }\r\n@media(max-width:1000px) { .direction-grid { grid-template-columns:1fr; } }\r\n.generation-progress:empty { display:none; }\r\n.generation-progress { margin:16px 0; padding:14px 18px; background:var(--field-bg); border:1px solid var(--line); border-radius:8px; text-align:left; }\r\n.generation-progress p { margin:0 0 6px; font-size:var(--ui-body); color:var(--ink); }\r\n.generation-progress small { color:var(--muted); }\r\n.generation-progress ul { padding-left:20px; margin:10px 0 0; color:var(--ink); font-size:var(--ui-control); line-height:1.8; }\r\n.fusion-pacing-summary { display:flex; flex-wrap:wrap; align-items:baseline; gap:8px 18px; margin:14px 0; padding:14px 18px; border:1px solid var(--line); border-radius:12px; background:var(--surface); font-size:var(--ui-control); }\r\n.fusion-pacing-summary strong { color:var(--ink); }\r\n.fusion-pacing-summary span { color:var(--muted); }\r\n.fusion-shot-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:16px; }\r\n.fusion-shot details textarea { min-height:180px; line-height:1.8; }\r\n\r\n\r\n.fusion-shot-time select{min-width:82px;max-width:180px;padding:8px;border:1px solid var(--line);border-radius:8px;background:var(--field-bg);color:var(--ink);font:inherit}.fusion-duration-rule p{margin:8px 0 0;line-height:1.6}\r\n\n/* Matches the main platform's themes.css / glassmorphism theme.\r\n   This stylesheet belongs to the script subsystem; the main app is unchanged. */\r\n:host {\r\n  color-scheme:light;\r\n  --ink:#242930;--ink-soft:#414a55;--muted:#56616c;--line:rgba(109,122,164,.2);--line-strong:rgba(109,122,164,.32);\r\n  --paper:#eeeff1;--surface:#f7f8ff;--surface-soft:#f1f4fd;--surface-muted:#e7ebf8;--surface-hover:#e4e9f9;--surface-active:#e5e5fa;\r\n  --field-bg:rgba(255,255,255,.52);--accent:#d2d8fa;--accent-hover:#c3ccf5;--accent-ink:#303b72;--accent-deep:#4b4a92;\r\n  --accent-soft:#eae6fa;--success:#28654f;--success-soft:#e2f2eb;--warning:#80551b;--warning-soft:#faf0db;--danger:#a23e50;--danger-soft:#fae8ed;\r\n  --focus-ring:rgba(92,98,171,.3);--glass-edge:inset 1px 1px 1px rgba(255,255,255,.95),inset -1px -1px 1px rgba(77,94,116,.09);\r\n  --shadow-float:var(--glass-edge),4px 18px 34px -16px rgba(53,67,80,.2);\r\n  --glass-material:radial-gradient(ellipse at 18% 100%,rgba(153,213,227,.2),transparent 55%),radial-gradient(ellipse at 100% 65%,rgba(196,184,225,.15),transparent 55%),linear-gradient(135deg,rgba(255,255,255,.65),rgba(255,255,255,.28));\r\n  --bg:var(--paper);--text:var(--ink);--panel:var(--surface);--input:var(--field-bg);--green:var(--accent-deep);--fusion-accent:var(--accent-deep);--script-muted:var(--muted);--rail-width:0px;\r\n  --ui-body:14px;--ui-control:14px;--ui-meta:12px;--ui-heading:24px;--ui-section:16px;\r\n  font-family:Inter,\"SF Pro Display\",\"PingFang SC\",\"Microsoft YaHei\",system-ui,sans-serif;font-size:14px;\r\n}\r\n.studio-body {background:radial-gradient(ellipse at 75% 10%,rgba(214,213,228,.24),transparent 45%),linear-gradient(140deg,#f1f2f3,#e9edef 60%,#eef0f2);color:var(--ink);line-height:1.65}\r\nbutton,input,select,textarea {font-family:inherit}\r\n::selection{background:var(--accent);color:var(--ink)}\r\ninput::placeholder,textarea::placeholder{color:var(--muted);opacity:.8}\r\ninput:focus,textarea:focus,select:focus{border-color:var(--accent-deep)!important;box-shadow:0 0 0 3px var(--focus-ring)}\r\nbutton:focus-visible,a:focus-visible,summary:focus-visible{outline:2px solid var(--accent-deep);outline-offset:3px}\r\n::-webkit-scrollbar-thumb{background:rgba(86,97,108,.35)}\r\n.workspace {margin-left:0;width:100%;max-width:none;height:100vh;height:100dvh;min-width:0}\r\n.project-header {height:auto;min-height:76px;padding:14px 28px;gap:16px;background:rgba(250,251,252,.62);border-color:rgba(255,255,255,.9);backdrop-filter:blur(22px);flex-wrap:wrap}\r\n.breadcrumb {gap:12px;max-width:100%}.breadcrumb strong{font-size:18px;color:var(--ink);max-width:min(380px,45vw)}.breadcrumb .crumb{color:var(--accent-deep);font-size:12px;letter-spacing:.05em}\r\n.header-actions {gap:8px;max-width:100%;flex-wrap:wrap}.header-actions>.button{display:inline-flex}\r\n.badge {background:var(--accent-soft);border:1px solid var(--line);color:var(--accent-deep);padding:3px 10px}\r\n.button,.icon-button,.tree-button {min-height:40px;border-radius:12px}\r\n.button {background:linear-gradient(135deg,rgba(255,255,255,.7),rgba(245,249,255,.4));border:1px solid rgba(255,255,255,.9);color:var(--ink-soft);box-shadow:var(--glass-edge);font-size:14px;padding:9px 14px}\r\n.button:hover {background:var(--surface-hover);border-color:var(--line-strong);color:var(--ink)}\r\n.button.primary {background:linear-gradient(125deg,#5369ab,#7560ac);color:#fff;border-color:transparent;font-weight:650}\r\n.button.primary:hover{background:linear-gradient(125deg,#455b9c,#66529d);color:#fff}\r\n.button.ghost {background:transparent;box-shadow:none;border-color:var(--line)}\r\n.button.danger,.error{color:var(--danger)}.button.green{background:var(--success-soft);color:var(--success)}\r\n.button.small{font-size:13px;padding:7px 11px}.icon-button{color:var(--muted);min-width:36px}.icon-button:hover{color:var(--accent-deep);background:var(--surface-hover)}\r\n.module-nav{height:62px;padding:0 28px;gap:8px;background:rgba(250,251,252,.6);border-bottom:1px solid var(--line);align-items:center;scrollbar-width:thin}\r\n.module-link {height:42px;padding:0 18px;border:1px solid transparent;border-radius:12px;font-size:14px;font-weight:600;color:var(--muted)}\r\n.module-link.active{color:var(--accent-deep);background:linear-gradient(110deg,rgba(207,223,253,.7),rgba(226,214,250,.65));border-color:rgba(255,255,255,.95);box-shadow:var(--glass-edge)}\r\n.module-link:hover{color:var(--accent-deep);background:var(--surface-hover)}\r\n.module-body{background:transparent;min-width:0}\r\n.bible-layout,.fusion-board-layout,.fusion-people,.version-workspace {flex-direction:column!important}\r\n.section-tree,.bible-tree{width:100%;height:auto;max-height:116px;min-height:62px;padding:10px 28px;display:flex;align-items:center;gap:8px;flex-shrink:0;border-right:0;border-bottom:1px solid var(--line);overflow:auto;background:transparent}\r\n.tree-title{padding:0 12px 0 0;gap:8px;flex-shrink:0}.tree-title>svg{display:none}.tree-title strong{font-size:13px}.tree-status{margin:0;font-size:11px}\r\n.tree-button{width:auto;flex:0 0 auto;gap:12px;padding:9px 16px;font-size:14px;white-space:nowrap;border:1px solid transparent}.bible-tree .tree-button>span:last-child{display:none}\r\n.tree-button.active{background:var(--surface-active);border-color:var(--line);color:var(--accent-deep)}.tree-button:hover{background:var(--surface-hover);color:var(--ink)}\r\n.editor-panel{background:transparent}.panel-heading{min-height:88px;height:auto;padding:20px 32px;background:transparent;border:0;gap:12px;flex-wrap:wrap}\r\n.panel-heading h1,.library-top h1{font-size:24px;font-weight:750;letter-spacing:-.03em;color:var(--ink)}\r\n.panel-heading .button{background:var(--field-bg);color:var(--ink-soft);padding:9px 14px}\r\n.save-state,.field label,.muted,.footer-note,.library-top p{color:var(--muted)}\r\n.form-scroll{padding:0 32px 28px}.form-content{max-width:1400px;margin:0 auto;padding:26px;border-radius:24px;background:var(--glass-material);border:1px solid rgba(255,255,255,.85);box-shadow:var(--shadow-float)}\r\n.field label{font-size:13px;font-weight:600;margin-bottom:8px}.field input,.field textarea,.field select,.input{background:var(--field-bg);border:1px solid var(--line);color:var(--ink);border-radius:12px;font-size:14px;padding:12px 14px}\r\n.field textarea{line-height:1.8}.field textarea.large{min-height:180px}.field textarea.tall{min-height:190px}\r\n.editor-footer{padding:12px 28px;background:rgba(250,251,252,.72);border-color:var(--line);min-height:68px;flex-wrap:wrap}.footer-actions{flex-wrap:wrap}\r\n.notice{background:var(--success-soft);border-color:rgba(40,101,79,.18);color:var(--success);border-radius:12px;font-size:13px}\r\n.notice.subtle{background:var(--surface-soft);border-color:var(--line);color:var(--muted)}.notice.warning{background:var(--warning-soft);color:var(--warning);border-color:rgba(128,85,27,.18)}\r\n.record-card,.export-card,.entity-card,.project-card,.fusion-shot{background:var(--glass-material);border:1px solid rgba(255,255,255,.85);border-radius:22px;box-shadow:var(--shadow-float);overflow:hidden}\r\n.record-name,.record-top strong{color:var(--ink)}.duration input{background:var(--field-bg);border-color:var(--line);color:var(--ink);min-width:52px}\r\n.full-scroll{padding:28px 32px}.library-top{gap:20px;flex-wrap:wrap}.library-tools{flex-wrap:wrap}.export-grid,.project-grid{max-width:1480px;margin:auto}.export-card header,.fusion-shot>header{background:rgba(255,255,255,.24);border-color:var(--line);color:var(--ink)}\r\n.project-cover{background:linear-gradient(125deg,#dbe6f6,#e6ddf4);color:var(--accent-deep)}\r\n.empty{background:rgba(255,255,255,.3);border-color:var(--line-strong);color:var(--muted);border-radius:20px}.empty h3{color:var(--ink)}.empty svg{color:var(--accent-deep)}\r\n.fusion-roster{order:-1;width:100%;max-height:130px;min-height:90px;flex-shrink:0;display:flex;gap:10px;align-items:center;overflow:auto;border:0;border-bottom:1px solid var(--line);background:transparent;padding:12px 28px}\r\n.fusion-roster-title{margin:0;flex-shrink:0;white-space:nowrap;font-size:13px;gap:8px}.fusion-person{width:auto;min-width:180px;max-width:260px;flex:0 0 auto;margin:0;padding:9px 14px;border:1px solid var(--line);border-radius:14px;background:var(--field-bg);color:var(--ink)}\r\n.fusion-person.active{background:var(--surface-active);border-color:var(--accent);color:var(--accent-deep)}.fusion-person small{color:var(--muted)}.fusion-person>div{display:none}.fusion-initial{background:var(--accent-soft);color:var(--accent-deep)}\r\n.fusion-tags span,.fusion-person span:not(.fusion-initial){background:var(--accent-soft);color:var(--accent-deep);border-color:var(--line)}\r\n.fusion-board-settings{border-radius:20px;background:var(--glass-material);border:1px solid rgba(255,255,255,.85);box-shadow:var(--shadow-float);gap:20px;padding:22px;flex-wrap:wrap}\r\n.fusion-board-main{max-width:1544px;width:100%;margin:0 auto}.fusion-board-grid{gap:22px}.fusion-shot-number{color:var(--accent-deep)}.fusion-shot-content{color:var(--ink)}.fusion-source{color:var(--muted);border-color:var(--accent);background:rgba(255,255,255,.22);padding:12px 16px;border-radius:8px}.fusion-source-label,.fusion-shot small,.fusion-footnote{color:var(--muted)}\r\n.fusion-shot-time input{color:var(--ink);background:var(--field-bg);border:1px solid var(--line);border-radius:8px;min-height:36px}.fusion-stats{color:var(--muted)}.fusion-stats strong{color:var(--ink)}\r\n.fusion-timing-badge.matched{background:var(--success-soft);color:var(--success)}.fusion-timing-badge.mismatch,.fusion-speech-note.over-budget{color:var(--warning);background:var(--warning-soft)}\r\n.script-module-tools{background:transparent;border-color:var(--line);padding:10px 28px;flex-shrink:0;overflow:auto}.script-nav-actions{gap:8px;flex-wrap:wrap;min-width:0}.script-nav-actions .button{font-size:13px;padding:7px 12px;border-radius:12px}.script-nav-actions [data-script-save]{color:var(--success);background:var(--success-soft);border-color:transparent}.script-nav-actions .parse-script{background:var(--field-bg)}\r\n.screenplay-layout{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);background:transparent!important;gap:0}\r\n.screenplay-layout.with-copilot:not(.focus-mode){grid-template-columns:minmax(0,1fr) 300px}\r\n.scene-directory{grid-column:1/-1;grid-row:1;position:static!important;display:flex!important;width:100%!important;height:auto;max-height:128px;min-height:100px;background:transparent;border:0;border-bottom:1px solid var(--line);padding:7px 28px;z-index:auto}\r\n.scene-directory>header{height:26px;min-height:26px;padding:0;border:0;justify-content:flex-start;gap:12px}.scene-directory>header strong{font-size:12px;font-weight:600;color:var(--muted)}.directory-add{width:28px;height:26px;min-height:26px;background:var(--field-bg);color:var(--accent-deep)}\r\n.scene-index{display:flex;gap:14px;overflow-x:auto;overflow-y:hidden;padding:5px 0;flex:1;align-items:stretch}.scene-index section{display:flex;align-items:center;gap:6px;margin:0;flex:0 0 auto;max-width:none}.scene-index h3{max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0 6px 0 0;font-size:12px}\r\n.scene-index-row{margin:0;min-height:44px;width:190px;flex-shrink:0;border:1px solid var(--line);background:var(--field-bg);border-radius:10px}.scene-index-row.active{background:var(--surface-active);border-color:var(--accent)}.scene-jump{padding:7px 10px;align-items:center;font-size:12px}.scene-jump>strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.scene-index-actions{opacity:1;width:22px}.scene-index-actions input{accent-color:var(--accent-deep);width:14px;height:14px}.scene-delete{color:var(--muted);width:18px}.scene-directory footer{display:none}.add-episode{width:auto;white-space:nowrap;padding:8px 14px;font-size:12px;flex:0 0 auto}.directory-toggle{display:none!important}\r\n.continuous-panel{grid-column:1;grid-row:2}.coauthor-panel{grid-column:2;grid-row:2;width:300px;background:rgba(250,251,252,.55);border-color:var(--line)}\r\n.screenplay-toolbar{height:auto;min-height:60px;background:transparent;border-color:var(--line);padding:9px 22px;gap:12px;flex-wrap:wrap}.screenplay-location small{color:var(--muted)}.screenplay-format{color:var(--muted)}.screenplay-format [role=group]{background:var(--field-bg)}.screenplay-format button.active{background:var(--surface-active);color:var(--accent-deep);border-color:var(--line)}\r\n.continuous-scroll{padding:20px 24px 0}.screenplay-paper{background:rgba(255,255,255,.7);color:var(--ink);box-shadow:var(--shadow-float);border:1px solid rgba(255,255,255,.9);border-radius:22px 22px 0 0;max-width:1080px;padding:36px 48px 100px 80px;line-height:1.9}.episode-cover h1{font-size:28px}.episode-cover,.screenplay-heading{border-color:var(--line)}.paragraph-tools{background:var(--surface);border-color:var(--line)}.script-edit:focus{background:var(--accent-soft)}\r\n.coauthor-panel>header{min-height:60px;border-color:var(--line)}.coauthor-conversation{border-color:var(--line)}.coauthor-conversation p,.coauthor-controls p,.coauthor-scope{color:var(--muted)}.coauthor-tasks button{background:var(--field-bg);border-color:var(--line);color:var(--ink)}.coauthor-tasks button.active{background:var(--surface-active);border-color:var(--accent-deep);box-shadow:none;color:var(--accent-deep)}.coauthor-controls textarea{background:var(--field-bg);color:var(--ink);border-color:var(--line);border-radius:12px}.panel-close{opacity:1}.coauthor-toggle{display:block!important;color:var(--accent-deep)}\r\n.screenplay-layout.focus-mode{grid-template-rows:minmax(0,1fr)}.screenplay-layout.focus-mode .scene-directory{display:none!important}.screenplay-layout.focus-mode .continuous-panel{grid-row:1}\r\n.history-sidebar{width:100%;height:142px;flex-shrink:0;border:0;border-bottom:1px solid var(--line);background:transparent;padding:8px 28px;display:flex}.history-sidebar>header{height:36px;padding:0;justify-content:flex-start;gap:20px}.history-list{display:flex;gap:10px;padding:5px 0;overflow:auto}.history-item{min-width:220px;width:220px;padding:9px 14px;gap:2px;margin:0;border:1px solid var(--line);border-radius:12px;background:var(--field-bg)}.history-item strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.history-item em{display:none}.history-item.active{background:var(--surface-active);border-color:var(--accent)}.history-sidebar>footer{display:none}.version-reader>header{background:transparent}.version-document{color:var(--ink);background:rgba(255,255,255,.6);max-width:1200px;width:100%;margin:0 auto}\r\ndialog{background:#f7f8ff;color:var(--ink);border:1px solid #fff;border-radius:24px;box-shadow:0 28px 80px rgba(56,64,115,.2);max-width:min(1020px,calc(100vw - 32px));width:820px}dialog::backdrop{background:rgba(50,58,78,.25);backdrop-filter:blur(7px)}.dialog-head,.dialog-foot{border-color:var(--line);background:rgba(255,255,255,.35)}.dialog-head h2{color:var(--ink)}.dialog-body{color:var(--ink-soft)}.preview{background:var(--surface-soft);border-color:var(--line);color:var(--ink);border-radius:14px;max-height:45vh;overflow:auto;overflow-wrap:anywhere;white-space:pre-wrap}.dialog-foot{gap:10px;flex-wrap:wrap}\r\n.ai-direction-card{background:var(--field-bg);border-color:var(--line);color:var(--ink)}.batch-banner{background:var(--accent-soft);color:var(--accent-deep);border-color:var(--line)}.batch-progress,.ai-progress-track{background:var(--surface-muted)}.ai-generation-progress{background:var(--surface-soft);border-color:var(--line);color:var(--ink)}\r\n#toast{background:var(--ink);color:#fff;border-radius:14px;border-color:transparent;box-shadow:var(--shadow-float)}\r\n.platform-kicker{color:var(--accent-deep);font-size:12px;font-weight:700;letter-spacing:.08em}.platform-intro p{margin:6px 0 18px}.platform-login,.platform-gaps{border:1px solid var(--line);border-radius:16px;padding:14px 18px;margin:16px 0;background:var(--field-bg)}summary{cursor:pointer;color:var(--accent-deep);font-weight:600}.platform-login .row{margin-top:18px}.platform-selectors{margin-top:20px}.platform-metrics{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}.platform-metrics span{background:var(--accent-soft);color:var(--accent-deep);border-radius:20px;padding:5px 12px}.platform-review{border-top:1px solid var(--line);padding-top:14px}.platform-warnings{font-size:13px;color:var(--muted)}.platform-gaps ul,.platform-warnings{padding-left:20px}.platform-gaps li,.platform-warnings li{margin:7px 0}.platform-review pre{font-size:12px}.platform-gaps p{font-size:12px;color:var(--muted)}\r\n.batch-banner{padding:5px 28px;min-height:40px;font-size:12px}.batch-banner .button{min-height:30px;padding:4px 10px;font-size:12px}\r\n.fusion-board-layout .section-tree{width:100%;min-width:0;max-height:106px}.fusion-board-layout .tree-button small{margin-top:0}\r\n@media(min-width:761px){.scene-directory{flex-direction:row;align-items:center;gap:14px;min-height:72px;max-height:72px}.scene-directory>header{height:auto;flex-shrink:0;gap:8px}.scene-index{height:58px;align-items:center}.scene-index-row{height:44px}}\r\n@media(max-width:1100px){.project-header{padding:12px 20px}.header-actions{gap:6px}.header-actions>.button{display:inline-flex}.screenplay-layout.with-copilot:not(.focus-mode){grid-template-columns:minmax(0,1fr) 260px}.coauthor-panel{width:260px}.library-tools{gap:8px}.fusion-board-grid{grid-template-columns:1fr}.fusion-board-settings{display:flex}.fusion-board-settings>.field{min-width:150px;flex:1}.fusion-stats{flex-basis:100%}.continuous-scroll{padding:14px 16px 0}}\r\n@media(max-width:760px){.project-header{padding:12px 16px;gap:10px}.breadcrumb strong{max-width:55vw}.breadcrumb .crumb{display:none}.header-actions{width:100%;overflow:auto;flex-wrap:nowrap;padding-bottom:2px}.header-actions .button{font-size:12px;min-height:36px;flex-shrink:0}.module-nav{height:56px;padding:0 16px;gap:3px}.module-link{font-size:13px;padding:0 13px}.module-link svg{width:17px}.section-tree,.fusion-roster{padding:8px 16px}.tree-title{display:none}.section-tree{min-height:58px}.tree-button{padding:8px 12px;font-size:13px}.panel-heading{padding:16px 18px;min-height:90px}.panel-heading h1,.library-top h1{font-size:22px}.panel-heading .button{font-size:12px;min-height:36px;padding:8px 10px}.form-scroll{padding:0 14px 20px}.form-content{padding:18px;border-radius:18px}.full-scroll{padding:20px 16px}.editor-footer{padding:10px 16px;gap:8px}.footer-note{display:none}.footer-actions{gap:6px}.footer-actions .button{font-size:12px;padding:8px 10px}.row{grid-template-columns:1fr;gap:0}.fusion-people .fusion-roster{display:flex}.fusion-person{min-width:155px}.script-module-tools{padding:8px 16px}.script-nav-actions{flex-wrap:nowrap;overflow:auto}.script-nav-actions .button{font-size:12px;min-height:36px;white-space:nowrap}.scene-directory{padding:6px 16px;min-height:94px;max-height:110px}.scene-index-row{width:170px}.screenplay-layout.with-copilot:not(.focus-mode){grid-template-columns:minmax(0,1fr)}.coauthor-panel{display:none;position:absolute;right:0;top:110px!important;bottom:0;width:min(320px,95vw);z-index:20;background:var(--surface);box-shadow:var(--shadow-float)}.coauthor-panel.mobile-open{display:flex}.screenplay-toolbar{padding:8px 16px;min-height:76px}.screenplay-location{flex-basis:100%}.screenplay-location small{display:none}.screenplay-format{margin-left:0}.continuous-scroll{padding:12px 10px 0}.screenplay-paper{padding:24px 24px 80px 36px;border-radius:16px 16px 0 0}.episode-cover h1{font-size:24px}.history-sidebar{height:136px;padding:8px 16px}.version-document{padding:22px 20px}.fusion-board-settings{padding:18px}.library-top{gap:14px;margin-bottom:20px}.library-tools{width:100%;overflow:auto;flex-wrap:nowrap}.library-tools .button{font-size:12px;min-height:38px}.fusion-shot>header{gap:10px}.fusion-shot-number{font-size:24px}.fusion-shot-content{padding:18px}.fusion-stats{font-size:13px}.record-card{padding:16px}.record-top{flex-wrap:wrap;gap:8px}.export-grid,.project-grid{grid-template-columns:1fr}dialog{max-width:calc(100vw - 20px);border-radius:20px}.dialog-head,.dialog-body,.dialog-foot{padding:18px}.dialog-head h2{font-size:20px}}\r\n@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation:none!important;transition:none!important}}\r\n@media(min-width:1001px){.coauthor-panel{display:flex;position:static;box-shadow:none}}\r\n@media(max-width:1000px){.screenplay-layout.with-copilot:not(.focus-mode){grid-template-columns:minmax(0,1fr)}.coauthor-panel{display:none;position:absolute;right:0;top:72px!important;bottom:0;width:min(320px,95vw);z-index:20;background:var(--surface);box-shadow:var(--shadow-float)}.coauthor-panel.mobile-open{display:flex}.screenplay-layout.focus-mode .coauthor-panel{display:none}}\r\n@media(max-width:760px){.coauthor-panel{top:100px!important}}\r\n.history-sidebar>header{height:36px;min-height:36px}.history-list{min-height:78px}.history-item{min-height:62px;flex:0 0 220px}.history-item strong,.history-item time{flex-shrink:0}\r\n\n/* A bounded reading column and grouped fields for the biography editor. */\r\n.fusion-people .fusion-roster{min-height:68px;max-height:82px;padding:8px 24px;gap:8px}\r\n.fusion-people .fusion-roster-title{font-size:12px;gap:8px}\r\n.fusion-people .fusion-person{min-width:148px;max-width:232px;padding:7px 12px;border-radius:12px;grid-template-columns:32px minmax(0,1fr);gap:2px 10px}\r\n.fusion-people .fusion-initial{width:32px;height:36px;font-size:17px;border-radius:8px}\r\n.fusion-people .fusion-person strong{font-size:14px}.fusion-people .fusion-person small{font-size:11px;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;max-width:172px}\r\n.fusion-people .panel-heading{width:min(936px,100%);margin:0 auto;min-height:72px;padding:16px 28px 12px;flex-wrap:nowrap}\r\n.fusion-people .panel-heading h1{font-size:22px;margin-bottom:3px}.fusion-people .panel-heading .save-state{font-size:11px}.fusion-people .panel-heading .button{min-height:36px;font-size:13px;padding:7px 12px}\r\n.fusion-people .form-scroll{padding:4px 28px 24px;scrollbar-gutter:stable both-edges}\r\n.fusion-people .form-content{width:100%;max-width:880px;margin:0 auto;padding:0;background:none;border:0;box-shadow:none;border-radius:0}\r\n.bio-section{margin:0 0 16px;border:1px solid rgba(255,255,255,.9);border-radius:18px;padding:20px 24px;background:rgba(255,255,255,.6);box-shadow:var(--shadow-float)}\r\n.bio-section-heading{display:flex;align-items:center;gap:12px;margin-bottom:18px}\r\n.bio-section-number{display:grid;place-items:center;width:30px;height:30px;flex-shrink:0;border:1px solid var(--line);border-radius:9px;background:var(--accent-soft);color:var(--accent-deep);font-size:11px;font-weight:700}\r\n.bio-section-heading h2{font-size:15px;font-weight:700;color:var(--ink);margin:0;line-height:1.5}.bio-section-heading p{font-size:12px;color:var(--muted);margin:2px 0 0;line-height:1.5}\r\n.bio-basics{display:grid;grid-template-columns:minmax(120px,.9fr) minmax(200px,1.8fr) 88px;gap:14px}\r\n.fusion-people .field{margin-bottom:16px}.fusion-people .field label{font-size:12px;line-height:1.5;margin-bottom:6px;color:var(--ink-soft);font-weight:600}\r\n.fusion-people .field input{min-height:40px;padding:8px 12px;font-size:14px;border-radius:10px;line-height:1.6}\r\n.fusion-people .field textarea{padding:12px 14px;min-height:92px;font-size:14px;line-height:1.85;border-radius:12px;background:rgba(255,255,255,.58)}\r\n.fusion-people .bio-story .field textarea{min-height:206px;max-height:500px;line-height:1.95}\r\n.bio-basics .field{margin-bottom:14px}.bio-traits .fusion-tags{margin-top:8px;gap:6px}.bio-traits .fusion-tags:empty{display:none}.bio-traits .fusion-tags span{font-size:11px;padding:3px 9px}\r\n.bio-section>.field:last-child,.bio-section>.row:last-child .field,.bio-traits.field{margin-bottom:0}\r\n.bio-elements .row{gap:14px}.bio-elements .row .field{margin-bottom:14px}\r\n.bio-delete{display:flex;justify-content:flex-end;padding:0 2px}.bio-delete .button{color:var(--muted);font-size:12px;min-height:34px;padding:6px 10px}\r\n.fusion-people .editor-footer{gap:12px;padding:10px 24px;min-height:58px}.fusion-people .editor-footer .footer-note{font-size:11px;flex:1}.fusion-people .editor-footer .button{font-size:13px;min-height:36px;padding:7px 12px}\r\n.module-tools{margin-left:auto;display:flex;gap:4px;flex-shrink:0}\r\n/* The main platform owns the outer navigation. Keep only a compact project bar. */\r\n:host[data-embedded=true] .studio-body{background:transparent}\r\n:host[data-embedded=true] .project-header{min-height:48px;padding:7px 18px;border:0;border-bottom:1px solid var(--line);background:rgba(255,255,255,.26);gap:8px}\r\n:host[data-embedded=true] .breadcrumb{gap:8px}:host[data-embedded=true] .breadcrumb .crumb,:host[data-embedded=true] .breadcrumb .badge{display:none}\r\n:host[data-embedded=true] .breadcrumb strong{font-size:14px;max-width:220px}\r\n:host[data-embedded=true] .header-actions{gap:6px}:host[data-embedded=true] .header-actions .button{min-height:32px;padding:5px 10px;font-size:12px;box-shadow:none}\r\n:host[data-embedded=true] .module-nav{height:48px;padding:0 18px;gap:4px;background:rgba(255,255,255,.26)}\r\n:host[data-embedded=true] .module-link{height:34px;font-size:13px;padding:0 12px;gap:6px}:host[data-embedded=true] .module-link svg{width:17px;height:17px}\r\n:host[data-embedded=true] .module-tools{margin-left:auto;display:flex;gap:4px;flex-shrink:0}\r\n:host[data-embedded=true] .module-tools .module-link{font-size:12px;font-weight:400}\r\n@media(max-width:760px){.fusion-people .panel-heading{padding:14px 18px 10px;min-height:68px;gap:8px;flex-wrap:wrap}.fusion-people .panel-heading h1{font-size:20px}.fusion-people .panel-heading .button{font-size:12px;min-height:34px;padding:6px 9px}.fusion-people .form-scroll{padding:4px 12px 18px;scrollbar-gutter:stable}.bio-section{padding:16px;margin-bottom:12px;border-radius:16px}.bio-section-heading{margin-bottom:14px}.bio-basics{grid-template-columns:minmax(0,1fr) minmax(0,1.6fr) 68px;gap:10px}.fusion-people .bio-basics .field input{padding:8px 10px}.bio-elements .row{grid-template-columns:1fr 1fr;gap:12px}.fusion-people .bio-story .field textarea{min-height:200px}.fusion-people .fusion-roster{padding:7px 16px;min-height:64px;max-height:78px}.fusion-people .editor-footer{padding:9px 14px}.fusion-people .editor-footer .footer-note{display:none}:host[data-embedded=true] .header-actions{width:auto;flex-wrap:nowrap;max-width:100%}:host[data-embedded=true] .project-header{padding:7px 12px}:host[data-embedded=true] .module-nav{padding:0 12px}:host[data-embedded=true] .module-tools{margin-left:8px}}\r\n@media(max-width:480px){.bio-basics{grid-template-columns:minmax(0,1fr) 74px}.bio-basics>.field:nth-child(2){grid-column:1/-1;grid-row:2}.bio-basics>.field:nth-child(3){grid-column:2;grid-row:1}.bio-elements .row{grid-template-columns:1fr}.fusion-people .panel-heading .button svg{display:none}.fusion-people .editor-footer .button{font-size:12px}.bio-section-heading p{font-size:11px}:host[data-embedded=true] .project-header{flex-wrap:nowrap}:host[data-embedded=true] .header-actions{flex:1;min-width:0;overflow:auto;justify-content:flex-start}:host[data-embedded=true] .breadcrumb strong{max-width:90px}}\r\n\r\n.workspace-login{width:min(580px,calc(100% - 48px));margin:12vh auto;padding:38px;border:1px solid #fff;border-radius:24px;background:var(--glass-material);box-shadow:var(--shadow-float)}.workspace-login h1{font-size:28px;margin:14px 0}.workspace-login p{color:var(--muted);line-height:1.8;font-size:14px}.workspace-login .login-eyebrow{font-size:12px;color:var(--accent-deep)}.workspace-login a{display:inline-flex;margin-top:20px;text-decoration:none}\r\n\n/* The platform owns the global navigation. Module directories stay vertical. */\r\n:host{--inner-directory-width:226px}\r\n.module-body{position:relative}\r\n.bible-layout,.fusion-board-layout,.fusion-people,.version-workspace{flex-direction:row!important}\r\n.section-tree,.section-tree.bible-tree,.fusion-board-layout .section-tree{\r\n  display:flex;flex-direction:column;align-items:stretch;flex:0 0 var(--inner-directory-width);\r\n  width:var(--inner-directory-width);min-width:0;min-height:0;height:auto;max-height:none;\r\n  padding:24px 14px;gap:7px;overflow-x:hidden;overflow-y:auto;\r\n  border-right:1px solid var(--line);border-bottom:0;background:rgba(250,251,252,.4);\r\n}\r\n.tree-title{display:flex;align-items:center;padding:0 10px 20px;gap:10px;white-space:normal}\r\n.tree-title>svg{display:block;width:24px;height:24px;color:var(--muted)}\r\n.tree-title strong{font-size:15px}.tree-status{margin-top:4px;font-size:11px}\r\n.section-tree .tree-button{display:flex;justify-content:space-between;align-items:center;width:100%;min-height:46px;flex:0 0 auto;padding:12px 14px;gap:8px;text-align:left;font-size:14px;white-space:normal;line-height:1.65}\r\n.bible-tree .tree-button>span:last-child{display:inline;color:var(--muted)}\r\n.fusion-board-layout .tree-button small{display:block;white-space:normal;margin-top:4px}\r\n.fusion-board-layout .tree-button>span:last-child{flex-shrink:0;font-size:12px;color:var(--muted)}\r\n.bible-layout .form-content{max-width:1080px}.bible-layout .panel-heading{min-height:82px}\r\n.fusion-board-main{width:auto;max-width:none;margin:0}.fusion-board-grid{grid-template-columns:repeat(2,minmax(0,1fr))}\r\n.fusion-board-main .library-tools{gap:6px}.fusion-board-main .library-tools .button{font-size:12px;padding:8px 11px}\r\n.fusion-board-settings{gap:16px;padding:18px}.fusion-stats{white-space:normal}\r\n.fusion-people .fusion-roster{\r\n  order:-1;display:flex;flex-direction:column;align-items:stretch;flex:0 0 var(--inner-directory-width);\r\n  width:var(--inner-directory-width);height:auto;min-height:0;max-height:none;padding:22px 12px;gap:10px;\r\n  border-left:0;border-right:1px solid var(--line);border-bottom:0;background:rgba(250,251,252,.4);overflow-y:auto;overflow-x:hidden;\r\n}\r\n.fusion-people .fusion-roster-title{display:flex;justify-content:space-between;min-height:38px;padding:0 5px;margin-bottom:4px;font-size:14px;white-space:normal}\r\n.fusion-people .fusion-person{display:grid;grid-template-columns:34px minmax(0,1fr);align-items:start;width:100%;min-width:0;max-width:none;min-height:72px;flex:0 0 auto;margin:0;padding:12px 10px;gap:3px 10px}\r\n.fusion-people .fusion-person strong{font-size:14px;line-height:1.6}.fusion-people .fusion-person small{font-size:12px;white-space:normal;overflow-wrap:anywhere;max-width:none;line-height:1.6}\r\n.fusion-people .fusion-initial{width:34px;height:40px;font-size:19px}\r\n.fusion-people .editor-panel{min-width:0;flex:1}.fusion-people .panel-heading{width:100%;max-width:936px;min-height:82px;flex-wrap:wrap}\r\n.fusion-people .form-content{max-width:880px}.fusion-people .panel-heading>div{margin-right:auto}\r\n.screenplay-layout,.screenplay-layout.with-copilot:not(.focus-mode){display:flex!important;flex-direction:row!important;grid-template-columns:none;grid-template-rows:none}\r\n.scene-directory{position:static!important;display:flex!important;flex-direction:column;align-items:stretch;flex:0 0 var(--inner-directory-width);width:var(--inner-directory-width)!important;height:auto;min-height:0;max-height:none;padding:0;gap:0;border-right:1px solid var(--line);border-bottom:0;background:rgba(250,251,252,.4)}\r\n.scene-directory>header{display:flex;height:58px;min-height:58px;justify-content:space-between;padding:0 16px;border-bottom:1px solid var(--line);gap:8px}\r\n.scene-directory>header strong{font-size:14px;color:var(--ink)}.directory-add{width:30px;height:30px;min-height:30px}\r\n.scene-index{display:block;min-height:0;height:auto;flex:1;padding:10px 10px 20px;overflow-x:hidden;overflow-y:auto}\r\n.scene-index section{display:block;margin:0 0 24px;max-width:100%}.scene-index h3{max-width:none;margin:12px 8px 8px;font-size:12px;white-space:normal;line-height:1.7}\r\n.scene-index-row{width:100%;height:auto;min-height:56px;margin:0 0 6px;flex-shrink:0;align-items:stretch}.scene-jump{padding:11px 10px;gap:8px;align-items:flex-start;font-size:13px}.scene-jump>strong{white-space:normal;overflow-wrap:anywhere}\r\n.scene-index-actions{opacity:0;width:22px}.scene-index-row:hover .scene-index-actions,.scene-index-row:focus-within .scene-index-actions,.scene-index-row:has(input:checked) .scene-index-actions{opacity:1}\r\n.scene-directory footer{display:block;padding:14px 12px;border-top:1px solid var(--line);font-size:11px}.add-episode{width:100%;padding:12px 8px;white-space:normal;font-size:12px}\r\n.continuous-panel,.screenplay-layout.with-copilot .continuous-panel{flex:1;min-width:0;margin-right:0}\r\n.screenplay-toolbar{min-height:58px;padding:9px 16px;flex-wrap:wrap}.screenplay-location{min-width:160px}.continuous-scroll{padding:18px 16px 0}.screenplay-paper{padding:30px 42px 90px 64px;border-radius:16px 16px 0 0}\r\n.coauthor-panel,.screenplay-layout.with-copilot .coauthor-panel{position:static;display:flex;flex:0 0 276px;width:276px;min-height:0;top:auto;bottom:auto;box-shadow:none;background:rgba(250,251,252,.5)}\r\n.coauthor-panel>header{min-height:58px}.coauthor-panel .panel-close{opacity:1}\r\n.screenplay-layout.focus-mode .scene-directory,.screenplay-layout.focus-mode .coauthor-panel{display:none!important}\r\n.screenplay-layout.focus-mode .continuous-panel{grid-row:auto}\r\n.history-sidebar{display:flex;flex-direction:column;flex:0 0 var(--inner-directory-width);width:var(--inner-directory-width);height:auto;min-height:0;max-height:none;padding:0;border-right:1px solid var(--line);border-bottom:0;background:rgba(250,251,252,.4)}\r\n.history-sidebar>header{height:auto;min-height:72px;padding:16px 12px;gap:8px;justify-content:space-between;flex-wrap:wrap}.history-sidebar>header strong{font-size:14px}.history-sidebar>header .button{font-size:12px;padding:7px 9px}\r\n.history-list{display:block;min-height:0;overflow-y:auto;overflow-x:hidden;flex:1;padding:0 10px 16px}.history-item{width:100%;min-width:0;max-width:none;min-height:90px;padding:12px;margin:0 0 8px;gap:5px}.history-item strong{white-space:normal;font-size:13px}.history-item em{display:block;font-size:11px}\r\n.history-sidebar>footer{display:block;font-size:11px;padding:14px;border-top:1px solid var(--line)}.history-empty{min-width:0;margin:0}\r\n.inner-nav-toggle{display:none}.version-reader{min-width:0}\r\n/* Direction selection is a page, not another copy of the homepage form. */\r\n.directions-workspace{display:block;overflow:hidden}.directions-scroll{height:100%;overflow:auto;padding:30px 32px 40px}\r\n.directions-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:24px}\r\n.directions-heading h1{font-size:26px;line-height:1.5;margin:4px 0 10px;letter-spacing:-.03em}.directions-heading p{font-size:13px;line-height:1.8;color:var(--muted);margin:0}.directions-heading .platform-kicker{color:var(--accent-deep);font-size:11px;letter-spacing:.12em}\r\n.directions-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;padding-top:8px}.directions-actions .button{font-size:12px;min-height:36px}\r\n.direction-brief{padding:18px 22px;background:rgba(255,255,255,.42);border:1px solid rgba(255,255,255,.85);border-radius:16px;margin-bottom:24px;box-shadow:var(--glass-edge)}\r\n.direction-budget{display:flex;gap:8px;flex-wrap:wrap}.direction-budget span{padding:3px 10px;border-radius:6px;background:var(--accent-soft);color:var(--accent-deep);font-size:11px}.direction-brief p{white-space:pre-wrap;overflow-wrap:anywhere;max-height:140px;overflow:auto;font-size:14px;line-height:1.8;margin:12px 0 0;color:var(--ink-soft)}\r\n.directions-workspace .direction-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.directions-workspace .direction-card{border-radius:18px;background:var(--glass-material);border:1px solid rgba(255,255,255,.95);box-shadow:var(--shadow-float)}\r\n.directions-workspace .direction-card.chosen{border-color:var(--accent-deep)}.direction-card>header .button{min-height:40px;font-size:13px}\r\n.directions-workspace .direction-card h3{font-size:21px}.directions-workspace .direction-card p{font-size:13px}.directions-workspace .direction-number{color:var(--accent-deep);font-size:12px;font-weight:600}.directions-workspace .direction-tags span{background:var(--accent-soft);border:0;color:var(--accent-deep);font-size:11px}\r\n.direction-pending{padding:24px;min-height:340px}.direction-pending h3{font-size:17px!important;margin:18px 0}.direction-pending p{color:var(--muted);font-size:13px;line-height:1.8}\r\n.direction-placeholder{margin:18px 0 30px}.direction-placeholder i{display:block;height:10px;border-radius:6px;background:var(--surface-muted);margin:14px 0}.direction-placeholder i:nth-child(2){width:80%}.direction-placeholder i:last-child{width:60%}\r\n.direction-grid[aria-busy=true] .direction-placeholder{animation:direction-breathe 1.6s ease-in-out infinite}\r\n.direction-running{display:flex;align-items:center;gap:18px;padding:16px 20px;margin:0 0 24px;background:var(--accent-soft);border:1px solid var(--line);border-radius:14px;color:var(--accent-deep)}.direction-running .spinner{width:22px;height:22px;flex-shrink:0;margin:0;border-width:2px}.direction-running strong{font-size:14px}.direction-running p{margin:5px 0 0;font-size:13px}.direction-running small{font-size:11px}.direction-running ul{font-size:12px}\r\n.direction-error{margin-bottom:24px}.direction-error p{margin:7px 0 0;white-space:pre-wrap}.directions-footnote{font-size:12px;color:var(--muted);margin:22px 0 0;line-height:1.8}\r\n@keyframes direction-breathe{50%{opacity:.4}}@media(prefers-reduced-motion:reduce){.direction-grid[aria-busy=true] .direction-placeholder{animation:none}}\r\n@media(max-width:1200px){:host{--inner-directory-width:204px}.bible-layout .form-scroll{padding:0 22px 24px}.bible-layout .panel-heading{padding:18px 22px}.fusion-board-grid{grid-template-columns:1fr}.directions-scroll{padding:24px}.directions-heading{flex-wrap:wrap;gap:12px}.directions-actions{justify-content:flex-start;padding:0}.direction-card>header,.direction-content{padding:18px}}\r\n@media(max-width:1000px){.screenplay-layout.with-copilot .coauthor-panel{display:none}.screenplay-layout.with-copilot .coauthor-panel.mobile-open{display:flex!important;position:absolute;right:0;top:58px!important;bottom:0;z-index:22;width:280px;background:var(--surface);box-shadow:var(--shadow-float)}.directions-workspace .direction-grid{grid-template-columns:1fr}.directions-workspace .direction-card>header{display:block}.direction-pending{min-height:230px}.direction-placeholder{margin-bottom:20px}}\r\n@media(max-width:680px){\r\n  .inner-nav-toggle{display:inline-flex!important;font-size:12px!important;padding:5px 9px!important;min-height:32px!important;flex-shrink:0}\r\n  .section-tree,.section-tree.bible-tree,.fusion-board-layout .section-tree,.fusion-people .fusion-roster,.history-sidebar{display:none}\r\n  .inner-nav-open .section-tree,.inner-nav-open .fusion-roster,.inner-nav-open .history-sidebar{position:absolute;display:flex;left:0;top:0;bottom:0;width:224px;max-height:none;height:auto;z-index:24;background:var(--surface);box-shadow:12px 0 35px rgba(56,64,115,.15)}\r\n  .scene-directory{display:none!important}.screenplay-location .directory-toggle{display:block!important}.screenplay-layout.directory-open .scene-directory{position:absolute!important;display:flex!important;left:0;top:70px;bottom:0;width:224px!important;z-index:24;background:var(--surface);box-shadow:var(--shadow-float)}\r\n  .scene-directory>header{min-height:52px}.screenplay-toolbar{min-height:70px}.screenplay-location{flex-basis:100%}.continuous-scroll{padding:12px 8px 0}.screenplay-paper{padding:24px 26px 70px 36px}.screenplay-layout.with-copilot .coauthor-panel.mobile-open{top:70px!important}\r\n  .bible-layout .panel-heading,.fusion-people .panel-heading{padding:16px;min-height:82px}.bible-layout .form-scroll{padding:0 12px 18px}.fusion-people .form-scroll{padding:0 12px 18px}.directions-scroll{padding:22px 16px}.directions-heading h1{font-size:23px}.directions-heading p{font-size:12px}.direction-brief{padding:16px}.directions-actions .button{font-size:12px}\r\n}\r\n\n.rm-layout{display:flex;min-height:0}.rm-scroll{flex:1;min-width:0;overflow:auto;padding:28px 34px 40px}.rm-content{max-width:1000px;margin:0 auto;font-size:14px;line-height:1.7}.rm-heading{margin-bottom:22px}.rm-heading h1{font-size:26px;margin:4px 0 8px}.rm-heading p{color:var(--muted);margin:0}.rm-heading p:first-child{font-size:11px;letter-spacing:.12em;color:var(--accent-deep)}.rm-controls,.rm-summary,.rm-shot{padding:22px;border:1px solid var(--line);border-radius:18px;background:var(--surface);margin-bottom:18px}.rm-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px}.rm-fields label,.rm-history{display:flex;flex-direction:column;gap:8px;font-size:13px;font-weight:600}.rm-fields select,.rm-fields input,.rm-history select{font:inherit;color:var(--text);border:1px solid var(--line);background:var(--input);padding:10px 12px;border-radius:10px;max-width:100%;width:100%;min-height:42px}.rm-control-foot{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;margin-top:18px}.rm-control-foot>span,.rm-report-meta,.rm-footnote,.rm-side-note{font-size:12px;color:var(--muted)}.rm-side-note{line-height:1.8;padding:14px}.rm-control-foot .button{white-space:nowrap}.rm-history{max-width:480px;margin:20px 0}.rm-report-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:14px}.rm-report-meta .button{font-size:12px}.rm-summary>strong{font-size:19px;color:var(--accent-deep)}.rm-text{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.9;margin:10px 0}.rm-tag{display:inline-block;border-radius:7px;background:var(--accent-soft);color:var(--accent-deep);padding:3px 8px;font-size:12px;white-space:nowrap}.rm-shot>header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:1px solid var(--line);padding-bottom:12px;margin-bottom:12px}.rm-shot h3{font-size:16px;line-height:1.7;margin:0}.rm-scores{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:14px 0}.rm-scores span{display:flex;align-items:center;justify-content:space-between;border:1px solid var(--line);border-radius:9px;padding:9px 12px;font-size:12px;gap:8px}.rm-scores b{color:var(--accent-deep)}.rm-dimensions{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin-top:15px}.rm-dimensions>section{border:1px solid var(--line);padding:14px;border-radius:12px}.rm-dimensions .rm-tag{margin-left:6px}.rm-compare{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:16px 0}.rm-compare>div{padding:16px;border:1px solid var(--line);border-radius:12px}.rm-compare>div:last-child{background:var(--accent-soft)}.rm-compare h4{font-size:13px;margin:0}.rm-content details{border-top:1px solid var(--line);padding-top:12px;margin-top:16px}.rm-content summary{cursor:pointer;color:var(--accent-deep);font-size:13px}.rm-empty{text-align:center;padding:50px 20px;border:1px dashed var(--line);border-radius:18px;margin:24px 0;color:var(--muted)}.rm-empty h2{font-size:19px;color:var(--text)}.rm-progress{padding:16px 20px;background:var(--accent-soft);border-radius:12px;margin:14px 0;color:var(--accent-deep)}.rm-footnote{line-height:1.9;margin-top:24px}.rm-layout .notice{margin:14px 0}.rm-content button:disabled{opacity:.55;cursor:not-allowed}\r\n@media(max-width:900px){.rm-scroll{padding:22px}.rm-scores{grid-template-columns:repeat(2,minmax(0,1fr))}.rm-compare{grid-template-columns:1fr}}\r\n@media(max-width:680px){.rm-scroll{padding:20px 14px}.rm-controls,.rm-summary,.rm-shot{padding:16px}.rm-heading h1{font-size:22px}.rm-fields{grid-template-columns:1fr}.rm-scores span{padding:8px;font-size:11px}.rm-report-meta{align-items:flex-start}.rm-shot>header{flex-wrap:wrap}}\r\n.rm-reuse{display:flex;align-items:center;gap:8px;margin-top:16px;font-size:13px;color:var(--text);cursor:pointer}.rm-reuse input{width:16px;height:16px;accent-color:var(--accent-deep)}.rm-scope-help,.rm-coverage{font-size:12px;color:var(--muted);line-height:1.8}.rm-progress-track{height:6px;background:var(--line);overflow:hidden;border-radius:6px;margin:10px 0}.rm-progress-track>span{display:block;height:100%;background:var(--accent-deep);transition:width .2s}.rm-all-reports h2{font-size:20px;margin:0}.rm-content .rm-episode-report{border:1px solid var(--line);border-radius:16px;background:var(--surface);padding:0;margin:14px 0;overflow:hidden}.rm-episode-report>summary{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px;color:var(--text);list-style:none}.rm-episode-report>summary::-webkit-details-marker{display:none}.rm-episode-report>summary:before{content:'›';font-size:22px;color:var(--accent-deep)}.rm-episode-report[open]>summary:before{transform:rotate(90deg)}.rm-episode-report>summary>span:first-of-type{flex:1;min-width:0}.rm-episode-report>summary strong{font-size:15px}.rm-episode-brief{display:block;margin-top:6px;color:var(--muted);font-size:12px;font-weight:400;overflow-wrap:anywhere}.rm-episode-body{border-top:1px solid var(--line);padding:20px}.rm-episode-body .rm-shot:last-child{margin-bottom:0}.rm-episode-report>summary:focus-visible{outline:2px solid var(--accent-deep);outline-offset:-4px}@media(max-width:680px){.rm-episode-report>summary{padding:14px;gap:10px}.rm-episode-body{padding:12px}}\r\n\n/* Native workspace only. Loaded last; colors come from the host theme, while\r\n   the editor's original layout, inner sidebars and typography stay intact. */\r\n:host {\r\n  --bg:var(--paper);--text:var(--ink);--panel:var(--surface);--input:var(--field-bg);\r\n  --glass-edge:var(--glass-edge-shadow,0 0 0 0 transparent);\r\n  --glass-material:var(--panel-glass,var(--surface));\r\n}\r\n.studio-body {\r\n  /* Creative labels/progress use the selected theme's primary accent, not\r\n     its violet secondary/status palette. The host's status tokens stay intact. */\r\n  --accent-soft:var(--surface-active);--accent-soft-ink:var(--accent-deep);\r\n  --running:var(--accent-deep);--running-soft:var(--surface-active);\r\n  color:var(--ink);\r\n  background:radial-gradient(ellipse at 90% 5%,var(--page-glow-b),transparent 65%),radial-gradient(ellipse at 15% 100%,var(--page-glow-a),transparent 65%),var(--paper);\r\n}\r\n.project-header,.module-nav,.editor-footer,\r\n:host([data-embedded=true]) .project-header,:host([data-embedded=true]) .module-nav {\r\n  background:var(--panel-glass);border-color:var(--line);\r\n}\r\n:host :is(.section-tree,.bible-tree,.fusion-roster,.scene-directory,.history-sidebar,.coauthor-panel),\r\n:host .screenplay-layout.with-copilot .coauthor-panel {background:var(--surface-soft);border-color:var(--line)}\r\n.form-content,.record-card,.export-card,.entity-card,.project-card,.fusion-shot,\r\n.fusion-board-settings,.directions-workspace .direction-card,.workspace-login {\r\n  background:var(--glass-material);border-color:var(--line);color:var(--ink);\r\n}\r\n.direction-brief,.bio-section,.ai-direction-card,.version-document {background:var(--surface);border-color:var(--line);color:var(--ink)}\r\n.screenplay-paper {background:var(--surface);color:var(--ink);border-color:var(--line)}\r\n.fusion-people .field textarea,.field input,.field textarea,.field select {background:var(--field-bg);color:var(--ink);border-color:var(--line)}\r\n.button,.panel-heading .button {background:var(--surface-glass,var(--surface));color:var(--ink-soft);border-color:var(--line);box-shadow:var(--glass-edge)}\r\n.button:hover {background:var(--surface-hover);color:var(--ink);border-color:var(--line-strong)}\r\n.button.primary {background:var(--button-strong);color:var(--button-strong-text);border-color:transparent}\r\n.button.primary:hover {background:var(--button-strong-hover);color:var(--button-strong-text)}\r\n.button.ghost {background:transparent}.button.danger {color:var(--danger)}.button.green {background:var(--surface-active);color:var(--accent-deep)}\r\n.module-link.active,.tree-button.active,.fusion-person.active,.scene-index-row.active {background:var(--nav-active,var(--surface-active));color:var(--accent-deep);border-color:var(--nav-active-border,var(--line))}\r\n.module-link:hover,.tree-button:hover,.fusion-person:hover {background:var(--surface-hover);color:var(--ink)}\r\n.direction-running,.ai-generation-progress,.batch-banner,.rm-progress {background:var(--running-soft);color:var(--running);border-color:var(--line)}\r\n.direction-budget span,.direction-tags span,.directions-workspace .direction-tags span,.badge,.fusion-tags span,.platform-metrics span,.rm-tag {background:var(--accent-soft);color:var(--accent-soft-ink);border-color:var(--line)}\r\n.project-cover {background:linear-gradient(135deg,var(--surface-active),var(--accent-soft));color:var(--accent-deep)}\r\n.fusion-shot>header,.export-card header,.dialog-head,.dialog-foot {background:var(--surface-soft);border-color:var(--line)}\r\n.fusion-source,.empty {background:var(--surface-soft);color:var(--muted);border-color:var(--line)}\r\ndialog {background:var(--surface);color:var(--ink);border-color:var(--line-strong);box-shadow:var(--shadow-modal)}\r\ndialog::backdrop {background:color-mix(in srgb,var(--ink) 24%,transparent)}\r\n.spinner {border-color:var(--line-strong);border-top-color:currentColor}\r\n\r\n/* Ordinary guidance is not a success notification. Keep warnings/errors\r\n   distinct while confirmation and saved-state decorations follow the theme. */\r\n.notice {background:var(--surface-soft);color:var(--ink-soft);border-color:var(--line)}\r\n.notice.subtle {background:var(--surface-soft);color:var(--muted);border-color:var(--line)}\r\n.notice.warning {background:var(--warning-soft);color:var(--warning);border-color:color-mix(in srgb,var(--warning) 22%,var(--line))}\r\n.notice.error {background:var(--danger-soft);color:var(--danger);border-color:color-mix(in srgb,var(--danger) 22%,var(--line))}\r\n.script-nav-actions [data-script-save],.fusion-timing-badge.matched {background:var(--surface-active);color:var(--accent-deep);border-color:var(--line)}\r\n.workspace:has(.screenplay-layout),.workspace:has(.version-workspace) {--script-muted:var(--muted)}\r\n#toast {background:var(--surface);color:var(--ink);border-color:var(--line-strong)}\r\n::-webkit-scrollbar-thumb {background:color-mix(in srgb,var(--muted) 45%,transparent)}\r\n\r\n/* Shared host palette reaches every editor, including its native dialogs. */\r\n:host([data-theme=\"cinematic\"]) .studio-body { background: var(--paper); }\r\n:host([data-theme=\"cinematic\"]) :is(.form-content,.record-card,.direction-card,.entity-card,.fusion-shot,.export-card) { border-radius:var(--theme-card-radius,16px);box-shadow:var(--shadow-float); }\r\n:host([data-theme=\"cinematic\"]) :is(.button,input,textarea,select) { border-radius:var(--theme-control-radius,10px); }\r\n:host([data-theme=\"cinematic\"]) :is(.project-header,.module-nav,.editor-footer) { background:var(--surface); }\r\n:host([data-theme=\"cinematic\"]) .module-link.active { border-bottom-color:var(--accent-deep); }\r\n:host dialog { max-width:calc(100% - 24px);max-height:calc(100dvh - 32px);overflow:auto;overscroll-behavior:contain;border-radius:var(--theme-workspace-radius,20px); }\r\n:host :is(button,a,input,textarea,select):focus-visible { outline:2px solid var(--accent-deep);outline-offset:3px; }\r\n:host :is(.dialog-head,.dialog-foot) { position:sticky;z-index:2;background:var(--surface); }\r\n:host .dialog-head { top:0; }\r\n:host .dialog-foot { bottom:0; }\r\n@media(max-width:700px) { :host :is(.button,.icon-button,.module-link) { min-height:44px; } }\r\n@media(prefers-reduced-motion:reduce) { :host * { scroll-behavior:auto;animation-duration:.01ms;transition-duration:.01ms; } }\r\n\r\n\r\n/* Native editor content responds to its host width, including sidebars. */\r\n:host :is(.form-content,.fusion-board-main,.version-reader,.panel-heading,.editor-footer,.field) { min-width:0; }\r\n:host :is(.panel-heading,.header-actions,.editor-footer,.library-tools,.dialog-foot) { flex-wrap:wrap; }\r\n:host :is(.panel-heading,.editor-footer) { height:auto; }\r\n:host :is(.field input,.field select,.field textarea) { min-width:0; max-width:100%; }\r\n:host :is(.panel-heading h1,.panel-heading h2,.breadcrumb strong,.fusion-shot h3) { white-space:normal; overflow-wrap:anywhere; }\r\n:host :is(.fusion-board-grid,.directions-workspace .direction-grid) { grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr)); }\r\n:host .bio-elements .row { grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr)); }\r\n:host dialog { box-sizing:border-box; max-width:calc(100vw - 24px); max-height:calc(100dvh - 24px); }\r\n@container (max-width:48rem) {\r\n  :host .project-header { height:auto; min-height:3.5rem; flex-wrap:wrap; gap:8px; padding:12px; }\r\n  :host .header-actions { max-width:100%; min-width:0; gap:6px; }\r\n  :host .breadcrumb { white-space:normal; flex-wrap:wrap; }\r\n  :host .breadcrumb strong { max-width:100%; }\r\n  :host .panel-heading { padding:14px; }\r\n  :host :is(.form-scroll,.directions-scroll,.fusion-board-main) { padding-inline:12px; }\r\n  :host :is(.bio-basics,.fusion-board-settings) { grid-template-columns:repeat(auto-fit,minmax(min(100%,10rem),1fr)); }\r\n}\r\n\r\n\r\n/* Shadow-root panels and native dialogs share the viewport scrollbar treatment. */\r\n:host, :host * { scrollbar-width: thin !important; scrollbar-color: var(--scrollbar-thumb, color-mix(in srgb, var(--muted) 30%, transparent)) transparent !important; }\r\n@supports selector(::-webkit-scrollbar) {\r\n  :host, :host * { scrollbar-width: auto !important; scrollbar-color: auto !important; }\r\n  ::-webkit-scrollbar { width: 6px !important; height: 6px !important; }\r\n  ::-webkit-scrollbar-track, ::-webkit-scrollbar-corner { background: transparent !important; }\r\n  ::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb, color-mix(in srgb, var(--muted) 30%, transparent)) !important; border: 1px solid transparent !important; border-radius: 999px !important; background-clip: padding-box !important; }\r\n  ::-webkit-scrollbar-thumb:hover, ::-webkit-scrollbar-thumb:active { background-color: var(--scrollbar-thumb-hover, color-mix(in srgb, var(--muted) 55%, transparent)) !important; }\r\n  ::-webkit-scrollbar-button { display: none !important; width: 0 !important; height: 0 !important; }\r\n}\r\n@media (forced-colors: active) {\r\n  :host, :host * { scrollbar-color: auto !important; scrollbar-width: auto !important; }\r\n  ::-webkit-scrollbar-thumb { background: CanvasText !important; }\r\n}\r\n\n.event-plan-summary{display:flex;flex-wrap:wrap;gap:12px 24px;padding:16px 0;align-items:center}\r\n.event-plan-list{display:grid;gap:12px;margin:12px 0;min-width:0}\r\n.event-plan-card{border:1px solid var(--line,#52617a);border-radius:12px;padding:16px;min-width:0;overflow-wrap:anywhere}\r\n.event-plan-card p{white-space:pre-wrap;line-height:1.65;margin:8px 0}\r\n.event-plan-card blockquote{margin:12px 0;padding:8px 12px;border-left:3px solid #779cde;white-space:pre-wrap}\r\n.event-plan-diff{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:12px}\r\n.event-plan-diff>div{padding:12px;background:rgba(100,140,205,.08);border-radius:8px}\r\n.event-plan-proposal{margin:20px 0}\r\n.event-plan-choice{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;margin:20px 0}\r\n.event-plan-choice input,.event-plan-choice select{width:100%;min-width:0}\r\n@media(max-width:640px){.event-plan-diff{grid-template-columns:1fr}.event-plan-card{padding:12px}}\r\n\n:host{display:block;height:100%;min-height:0;width:100%;container-type:inline-size}.studio-body,#app,.workspace{height:100%;min-height:0;width:100%;margin:0}.workspace{max-height:100%}.studio-body{overflow:hidden}");
const {document,window,history,location,fetch,StoryHost,localStorage,setTimeout,clearTimeout,setInterval,clearInterval,IntersectionObserver}=scope;
const globalThis={StoryHost};
let SceneData,ReelMentor,ReelMentorUI,SceneCore,EventPlan,EventPlanUI,Fusion,ProductionFields,SceneAI,SceneBatch,SceneEditor,PlatformUI;

// data.js
(() => {
  const clone=v=>JSON.parse(JSON.stringify(v));
  const action=text=>({type:'action',text,speaker:'',parenthetical:''});
  const dialogue=(speaker,text,parenthetical='')=>({type:'dialogue',text,speaker,parenthetical});
  function scene(id,heading,blocks){return {id,heading,blocks};}
  const characters=[
    {id:'lin-xia',name:'林夏',role:'主角，南方短视频编导',goal:'完成公司交给的哈尔滨旅游宣传片拍摄任务，获得转正机会。',motivation:'害怕被淘汰，想证明自己不只是会做流量模板的年轻人。',flaw:'过度依赖数据和套路，习惯用预设脚本框住真实场景，缺乏耐心观察。',arc:'从追求流量爆款到学会等待真实瞬间，从把哈尔滨当素材库到真正理解一座城市的温度。',relationships:'与赵铁生从雇佣关系变为互相尊重的搭档；与公司老板保持远程压力关系。'},
    {id:'zhao-tiesheng',name:'赵铁生',role:'本地老摄影师，向导',goal:'完成亡妻未竟的心愿——拍下哈尔滨冬天最普通的笑脸。',motivation:'对城市有极深感情，不愿看到家乡被拍成浅薄的网红打卡视频。',flaw:'固执、沉默、拒绝解释，习惯用行动代替沟通，对年轻人缺乏信任。',arc:'从封闭内心到重新打开与人合作的可能，从抗拒流量到理解传播本身的价值。',relationships:'与林夏从对立到互补；与老道外修表匠老周是多年老友。'},
    {id:'zhou',name:'周师傅',role:'老道外修表匠，赵铁生老友',goal:'守住即将拆迁的老店，等儿子从南方回来过年。',motivation:'对老手艺和旧街区的眷恋，对家庭团圆的渴望。',flaw:'过于固执，不愿接受街区改造的现实，把情感寄托在可能不会回来的人身上。',arc:'从拒绝面对拆迁到接受改变，并把修好的旧钟送给林夏作为纪念。',relationships:'赵铁生的多年好友；与林夏因一次拍摄意外产生信任。'},
    {id:'chen-xue',name:'陈雪',role:'冰雪大世界冰雕师',goal:'在冰雪大世界闭幕前完成一座大型冰雕作品。',motivation:'继承父亲冰雕手艺，想让更多人看到哈尔滨冰雕不只是灯光秀。',flaw:'过度追求完美，不愿让别人看到未完成的作品，拒绝任何拍摄干扰。',arc:'从拒绝被拍到主动邀请林夏记录冰雕完成前的最后三小时。',relationships:'与赵铁生相识但不熟；对林夏最初有戒备，后因理解拍摄意义而接纳。'}
  ];
  const outlines=[
    {number:1,title:'零下三十度的陌生人',duration:15,goal:'林夏抵达哈尔滨，与赵铁生建立工作关系并完成第一天拍摄。',conflict:'林夏想拍冰雪大世界灯光秀和网红打卡点，赵铁生却坚持先拍中央大街清晨扫雪的环卫工，两人对拍摄方向产生激烈分歧。',turn:'林夏的相机因低温关机，赵铁生用体温帮她暖电池，并说了一句“机器怕冷，人也怕，但城市不怕”。',hook:'赵铁生手机屏保是一张模糊的雪地合影，林夏追问时他沉默离开。'},
    {number:2,title:'老道外的钟声',duration:15,goal:'林夏试图用流量逻辑说服赵铁生，却被迫进入老道外拍摄。',conflict:'林夏想拍马迭尔冰棍和锅包肉探店，赵铁生却带她去老道外修表铺，拍周师傅修一只停摆三十年的老钟。林夏认为毫无流量价值。',turn:'周师傅让林夏亲手拧动钟表发条，钟声响起时，林夏第一次没有看拍摄回放。',hook:'周师傅收到儿子短信，说今年不回来过年，赵铁生脸色骤变。'},
    {number:3,title:'冰面之下',duration:15,goal:'林夏尝试独立拍摄松花江冰面素材，却遭遇现实困难。',conflict:'林夏按脚本拍摄松花江上的冰上娱乐项目，但大风、人流和冰面反光让所有镜头都不可用。赵铁生不帮忙，只在一旁拍冰钓老人。',turn:'林夏摔倒在冰面上，赵铁生扶起她后，把冰钓老人刚送的冻鱼塞进她怀里，说“这才是松花江”。',hook:'林夏在赵铁生相机里发现大量已故妻子的照片，背景全是哈尔滨冬天。'},
    {number:4,title:'大雪人不会笑',duration:15,goal:'林夏与赵铁生合作拍摄音乐公园大雪人，关系出现转机。',conflict:'林夏坚持要拍大雪人正面全景，赵铁生却带她绕到雪人背后，拍一群孩子在雪人影子下堆小雪人。林夏认为偏离主题。',turn:'一个孩子把围巾系在小雪人脖子上，林夏下意识蹲下抓拍，赵铁生第一次主动帮她调整机位。',hook:'赵铁生告诉林夏，妻子生前最后一个愿望是拍下哈尔滨冬天最普通的笑脸，但没来得及完成。'},
    {number:5,title:'最后三小时',duration:15,goal:'完成冰雪大世界最终拍摄，林夏做出关键创作选择。',conflict:'林夏原计划拍摄冰雪大世界闭园灯光秀，但赵铁生带她找到冰雕师陈雪，陈雪拒绝拍摄未完成作品。时间只剩最后三小时。',turn:'林夏放弃灯光秀脚本，关掉补光灯，用自然光记录陈雪完成冰雕的最后三小时，并意外拍到陈雪父亲默默站在远处观看。',hook:'成片发布后，林夏收到公司转正通知，但她把赵铁生送的相机挂在脖子上，走向中央大街清晨的扫雪声。'}
  ];
  const bible={
    core:{logline:'一个南方短视频编导为完成哈尔滨旅游宣传任务，在零下三十度的冰城被迫与一位沉默寡言的本地老摄影师搭档，五天内从互相嫌弃到共同拍出真正有温度的城市影像。',story:'以哈尔滨冬季旅游为背景，通过一对性格、地域、创作理念完全相反的搭档，在极寒环境中完成五段短视频拍摄任务，展现冰雪大世界、中央大街、老道外、松花江、音乐公园等地方特色，并探讨流量逻辑与真实情感之间的冲突。',genre:'剧情',tone:'冷冽中带幽默，克制中渐生暖意，纪实感与诗意并存。',theme:'真正能打动人心的不是完美画面，而是画面背后真实的人与记忆。'},
    world:{era:'当代',locations:'哈尔滨冰雪大世界\n中央大街\n老道外中华巴洛克街区\n松花江冰面\n群力音乐公园大雪人\n老厨家锅包肉老店\n马迭尔冷饮厅',rules:'所有拍摄必须在真实哈尔滨地标完成，不得虚构不存在的地点。\n哈尔滨冬季室外温度极低，任何角色在户外超过二十分钟都必须出现寒冷反应。\n短视频拍摄受自然光、人流、设备耗电等现实条件限制，不能随意获得完美镜头。\n地方特色必须自然融入剧情，不得以旁白式介绍硬性输出。\n角色之间不会因为一次谈话就彻底和解，关系改善必须通过具体行动逐步推进。',facts:'故事发生在哈尔滨冬季旅游旺季。\n主角林夏是第一次来哈尔滨的南方人。\n老摄影师赵铁生是哈尔滨本地人，妻子已去世。\n五集对应五天拍摄任务，时间线连续不中断。\n最终成片必须包含哈尔滨地方特色，但具体内容由角色在过程中发现。'},
    characters,
    structure:{mainline:'林夏与赵铁生在五天拍摄中从冲突到理解，最终共同完成一部关于哈尔滨冬天普通人的短片，同时各自面对内心缺失。',opening:'林夏抵达哈尔滨，发现原定摄影师临时退出，公司要求五天内必须交片。她被迫雇佣赵铁生，但两人对拍摄内容产生根本分歧。',development:'五天内，林夏不断试图套用流量模板，赵铁生则带她深入老道外、松花江、音乐公园等非打卡地，拍摄普通人的真实瞬间。林夏逐渐发现赵铁生坚持背后的故事。',climax:'最后一天拍摄冰雪大世界时，林夏放弃预设脚本，跟随赵铁生等待冰雕师陈雪完成作品的最后时刻，并意外拍到陈雪父亲到场的一幕。',ending:'林夏用五天素材剪出成片，没有使用任何预设模板，却获得公司认可。赵铁生将亡妻留下的相机交给林夏，两人约定明年冬天再拍。'},
    outlines
  };
  const scenes=[
    [scene('s1-1','外景 哈尔滨中央大街 - 夜',[action('林夏拖着行李箱站在冰雕旁，呼出的白气遮住手机屏幕。赵铁生从人群中走来，没说话，先递上一副厚手套。'),dialogue('林夏','先拍冰雪大世界灯光秀，我脚本都写好了。'),dialogue('赵铁生','明早五点，中央大街，拍扫雪的环卫工。'),action('林夏皱眉，赵铁生已经转身走向街角。')]),
     scene('s1-2','外景 中央大街街角 - 夜',[action('赵铁生掏出手机看时间，屏保亮起——一张模糊的雪地合影。林夏凑近。'),dialogue('林夏','这是谁？'),action('赵铁生按灭手机，沉默地走进夜色。')]),
     scene('s1-3','外景 中央大街 - 晨',[action('林夏举起相机对准扫雪的环卫工，屏幕突然黑掉。她拍打机身，手指已经僵硬。'),dialogue('林夏','怎么没电了？'),action('赵铁生走过来，取下电池，掀开外套，把电池贴在自己胸口。'),dialogue('赵铁生','机器怕冷，人也怕，但城市不怕。'),action('林夏看着他的动作，呼出一口白气，没有再说话。')])],
    [scene('s2-1','外景 老道外中华巴洛克街区 - 日',[action('林夏举着手机，镜头对准街边马迭尔冰棍摊，嘴里念叨着探店脚本。赵铁生突然转身，拐进一条挂满旧招牌的巷子。'),dialogue('林夏','赵老师，锅包肉店在前面，您走反了。','追上，压低声音'),dialogue('赵铁生','跟我走。'),action('林夏无奈收起手机，跟着赵铁生穿过斑驳的巴洛克门楼，脚下积雪发出咯吱声。')]),
     scene('s2-2','内景 老道外修表铺 - 日',[action('铺子里挂满停摆的旧钟，周师傅坐在工作台前，手机屏幕亮起。他盯着短信，手指在台面上轻轻敲了两下。'),dialogue('赵铁生','老周，儿子怎么说？','站在门口，声音发沉'),dialogue('周师傅','今年不回来了。','把手机反扣在桌上'),action('赵铁生脸色骤变，没说话，走到墙角拿起一只落灰的老钟，用袖口慢慢擦。'),dialogue('林夏','修表铺没流量，我们拍锅包肉吧。','小声，对赵铁生'),dialogue('赵铁生','拍这只钟。停摆三十年了。')]),
     scene('s2-3','内景 老道外修表铺 - 日',[action('周师傅把老钟推到林夏面前，指指侧面发条孔。林夏犹豫着伸出手，指尖碰到冰凉的铜制发条。'),dialogue('周师傅','你拧。','轻声'),action('林夏慢慢转动发条，一下，两下。钟摆开始晃动，整点报时声突然响起，低沉悠长，震得铺子里的旧钟都跟着嗡鸣。'),action('林夏的手从相机上松开，没有去按回放键。她抬头看着周师傅，又看看赵铁生。'),dialogue('赵铁生','钟声不停，老道外就还在。','低声')])],
    [scene('s3-1','外景 松花江冰面 - 日',[action('大风卷起雪粒，冰面反光刺眼。林夏蹲在冰上，举着手机拍摄冰上滑梯，镜头里全是攒动的人影。'),action('她皱眉回放，画面过曝。转头看见赵铁生蹲在不远处，举着相机拍冰钓老人，没理她。'),action('林夏走过去，瞥见赵铁生相机屏幕——照片里全是同一个女人，站在哈尔滨各个冬天的角落。'),dialogue('林夏','这是谁？'),action('赵铁生关掉相机，没抬头。'),dialogue('赵铁生','拍你的。'),action('林夏抿嘴，转身继续拍。一阵强风刮来，她脚下一滑，重重摔在冰面上。'),action('赵铁生快步过来，一把扶起她。冰钓老人递来一条冻鱼，赵铁生接过，塞进林夏怀里。'),dialogue('赵铁生','这才是松花江。'),action('林夏抱着冻鱼，呼出的白气遮住半张脸。')])],
    [scene('s4-1','外景 群力音乐公园大雪人 - 日',[action('林夏架好三脚架，对准大雪人正面。赵铁生却往雪人背后走。'),dialogue('林夏','赵老师，主题是大雪人，你往哪儿走？'),dialogue('赵铁生','背后有东西。'),action('林夏不情愿地跟过去。雪人影子下，几个孩子蹲着堆小雪人。'),dialogue('林夏','这跟脚本完全没关系。'),dialogue('赵铁生','我妻子最后想拍哈尔滨冬天最普通的笑脸。没来得及。'),action('一个孩子把红围巾系在小雪人脖子上。林夏下意识蹲下抓拍。'),action('赵铁生第一次主动伸手，帮林夏调整机位。'),dialogue('赵铁生','再低一点。')])],
    [scene('s5-1','外景 冰雪大世界 - 夜',[action('冰雕区灯光未亮，陈雪站在半成品冰雕前，凿子停在半空。'),dialogue('陈雪','别拍。没完成的东西，拍出来是假的。'),dialogue('林夏','可我们只剩最后三小时。','看表'),action('赵铁生拉林夏退后一步，指了指陈雪握凿子的手。')]),
     scene('s5-2','外景 冰雪大世界 - 夜',[action('林夏关掉补光灯，把脚本塞进口袋。'),dialogue('林夏','不拍灯光秀了，就拍你。'),action('陈雪愣住，随后继续凿冰。冰屑溅起，在月光下像碎星。'),action('赵铁生默默递过一副薄手套，林夏摇头，继续端稳相机。')]),
     scene('s5-3','外景 冰雪大世界 - 夜',[action('三小时过去，冰雕完成。远处一个老人静静站着，是陈雪的父亲。'),dialogue('赵铁生','他每年都来，只是不让她知道。','低声'),action('林夏把镜头缓缓推过去，老人转身消失在夜色里。'),dialogue('林夏','拍到了。','轻声')])]
  ];
  function seedProject(){const now=new Date().toISOString();return {id:'harbin-five-days',name:'guanguang',status:'进行中',createdAt:now,updatedAt:now,revision:1,confirmedRevision:1,confirmedAt:now,bible:clone(bible),confirmedBible:clone(bible),scripts:outlines.map((o,i)=>({number:o.number,title:o.title,basedOnRevision:1,scenes:clone(scenes[i])})),entities:[characters[2],characters[0],characters[1],characters[3]].map(c=>({id:'entity-'+c.id,type:'角色',name:c.name,description:c.role+'；'+c.goal+'；'+c.arc,status:'待确认'})),snapshots:[],productions:[],novels:[]};}
  function blankProject(name='未命名项目'){const p=seedProject();p.id='p-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);p.name=name;p.bible={core:{logline:'',story:'',genre:'剧情',tone:'',theme:''},world:{era:'当代',locations:'',rules:'',facts:''},characters:[],structure:{mainline:'',opening:'',development:'',climax:'',ending:''},outlines:[{number:1,title:'第一个故事',duration:null,goal:'',conflict:'',turn:'',hook:''}]};p.confirmedRevision=0;p.confirmedBible=null;p.confirmedAt='';p.scripts=[{number:1,title:'第一个故事',basedOnRevision:0,scenes:[]}];p.entities=[];p.visualStyle='写实电影感';p.aspectRatio='9:16';p.storyboards=[];return p;}
  globalThis.SceneData={seedProject,blankProject,action,dialogue};
})();

SceneData=globalThis.SceneData;

// reelmentor.js
/* Shared, dependency-free contracts for the standalone and embedded script studios. */
(() => {
  'use strict';
  const tasks=['cognitive-guard','persona-screening','audio-emotion'];
  const labels={'cognitive-guard':'认知安全风控','persona-screening':'受众心智适配','audio-emotion':'视听声学规划'};
  const dimensions={factuality:'事实造假',causal_fallacy:'因果误导',panic_inducement:'恐慌煽动',bias_polarization:'偏见极化',cognitive_overload:'认知过载',anchoring_framing:'认知锚定'};
  const version='reelmentor-node-1';
  const fail=m=>{throw new Error('创作分析：'+m);};
  const obj=(v,label)=>{if(!v||typeof v!=='object'||Array.isArray(v))fail(label+'须为对象');return v;};
  const text=(v,label,max=2000,empty=false)=>{if(typeof v!=='string'||v.length>max||(!empty&&!v.trim()))fail(label+'为空或长度无效');return v.trim();};
  const list=(v,label,min=0,max=40)=>{if(!Array.isArray(v)||v.length<min||v.length>max)fail(label+'数量无效');return v;};
  const num=(v,label,min,max,int=false)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max||(int&&!Number.isInteger(v)))fail(label+'数值无效');return v;};
  const yes=(v,label)=>{if(typeof v!=='boolean')fail(label+'须为布尔值');return v;};
  const choice=(v,values,label)=>{if(!values.includes(v))fail(label+'取值无效');return v;};
  const strings=(v,label,min=0,max=10,len=300)=>list(v,label,min,max).map(x=>text(x,label,len));
  const count=s=>Array.from(s).length;
  const short=(v,label,max)=>{const s=text(v,label,200);if(count(s)>max)fail(label+'不能超过'+max+'字');return s;};
  function source(p,episode){
    if(!Number.isInteger(episode)||episode<1||episode>300)fail('分集编号无效');
    const b=(p.storyboards||[]).find(b=>b.episode===episode),e=(p.scripts||[]).find(e=>e.number===episode);
    const fromBoard=!!b?.shots?.length;
    const originals=fromBoard?b.shots:e?.scenes||[];
    if(!originals.length)fail('当前分集暂无分镜或剧本数据');
    if(originals.length>40)fail('每次最多分析40个镜头或分场，请先拆分分集');
    const ids=originals.map(s=>text(s.id,'源镜头ID',150));
    if(new Set(ids).size!==ids.length)fail('源镜头ID重复');
    const shots=originals.map((s,i)=>{
      const dialogue=fromBoard?(s.spokenText==null?null:s.spokenText):s.blocks.filter(b=>b.type==='dialogue').map(b=>[b.speaker,b.text].filter(Boolean).join('：')).join(' / ');
      if(dialogue===null)fail('第 '+(i+1)+' 镜尚未核对实际对白，请先填写（无对白可留空）');
      return {shot_id:i+1,scene:s.heading||'场景 '+(i+1),visual:fromBoard?[s.notes,s.videoPrompt,s.imagePrompt].filter(Boolean).join('\n'):s.blocks.filter(b=>b.type==='action').map(b=>b.text).join('；')||s.heading,dialogue:dialogue.trim()||'无',duration:fromBoard?String(s.duration)+'s':'未拆分',source_id:s.id};
    });
    const range=globalThis.EventPlan?.current(p,episode)?.selection;
    const target=range?.minSeconds!=null&&fromBoard?b.shots.reduce((sum,shot)=>sum+shot.duration,0):range?.target||p.bible?.outlines?.find(o=>o.number===episode)?.duration||b?.targetDuration||null;
    const value={source_kind:fromBoard?'storyboard':'scenes',episode,target_duration:target,...(range?.minSeconds!=null?{duration_range:{min:range.minSeconds,max:range.target}}:{}),parsed_shots:shots,characters:(p.bible?.characters||[]).map(c=>({id:c.id,name:c.name,role:c.role,age:c.age})),visual_style:p.visualStyle||''};
    if(JSON.stringify(value).length>180000)fail('本集资料过长，请精简镜头说明后再分析');
    return value;
  }
  function bgmBounds(input){
    const n=input.parsed_shots.length,total=input.parsed_shots.reduce((n,s)=>n+(parseFloat(s.duration)||0),0);
    return {min:n<=3||total<=30?1:2,max:Math.min(4,n)};
  }
  function id(value,n){if(typeof value==='string'&&!/^[1-9]\d*$/.test(value))fail('镜头编号无效');return num(Number(value),'镜头编号',1,n,true);}
  function rows(value,input,label,normalize){
    const n=input.parsed_shots.length,seen=new Set();
    return list(value,label,n,n).map(v=>{obj(v,label);const k=id(v.shot_id,n);if(seen.has(k))fail('镜头编号重复');seen.add(k);return {shot_id:k,...normalize(v,input.parsed_shots[k-1])};}).sort((a,b)=>a.shot_id-b.shot_id);
  }
  function validate(task,result,input){
    choice(task,tasks,'分析类型');obj(result,'报告');obj(input,'输入');const n=list(input.parsed_shots,'输入镜头',1,40).length;
    let out;
    if(task==='cognitive-guard'){
      const s=obj(result.synthesis,'全片结论'),sy=obj(s.synergy_evaluation,'协同评估');
      const shots=rows(result.shots,input,'逐镜认知报告',v=>{
        const raw=obj(v.dimension_scores,'六维评分'),scores={},explanations={};
        if(Object.keys(raw).some(k=>!Object.hasOwn(dimensions,k)))fail('存在未知评分维度');
        const exp=obj(v.dimension_explanations,'维度说明');
        for(const k of Object.keys(dimensions)){scores[k]=num(raw[k],dimensions[k],1,5,true);if(scores[k]>1)explanations[k]=text(exp[k],dimensions[k]+'依据',500);}
        const needs=yes(v.needs_revision,'修改标记');if(needs!==Object.values(scores).some(v=>v>=3))fail('修改标记与六维评分不一致');
        const replacement=needs?text(v.safe_replacement,'具体改写',5000):v.safe_replacement===null?null:fail('无需改写时替换须为空');
        const conflict=yes(v.cross_modal_conflict_detected,'声画冲突标记');
        return {shot_diagnostic_verdict:text(v.shot_diagnostic_verdict,'逐镜结论',1500),dimension_scores:scores,dimension_explanations:explanations,cross_modal_conflict_detected:conflict,cross_modal_conflict_description:text(v.cross_modal_conflict_description,'声画冲突说明',1000,!conflict),violations:strings(v.violations,'问题列表',0,10,500),needs_revision:needs,safe_replacement:replacement};
      });
      const high=list(s.high_risk_shot_ids,'高风险镜头',0,n).map(v=>id(v,n));if(new Set(high).size!==high.length||high.some(i=>!shots[i-1].needs_revision))fail('高风险镜头与逐镜结论不一致');
      const triggered=yes(sy.is_synergy_triggered,'协同标记'),type=choice(sy.synergy_type,['跨类叠加','同类叠加','连续累积','无'],'协同类型'),escalation=choice(sy.escalation_applied,['未升级','L1->L2','L2->L3'],'风险升级');
      if(!triggered&&(type!=='无'||escalation!=='未升级'))fail('无协同触发时不能升级');
      if(triggered&&type==='无')fail('协同类型与触发标记不一致');
      const level=choice(s.overall_risk_level,['L0','L1','L2','L3'],'整体风险');if(level==='L0'&&shots.some(s=>s.needs_revision))fail('整体安全与逐镜改写结论冲突');
      out={synthesis:{overall_risk_level:level,synergy_evaluation:{is_synergy_triggered:triggered,synergy_type:type,escalation_applied:escalation,rationale:text(sy.rationale,'协同依据',1500)},high_risk_shot_ids:high,audit_summary:short(s.audit_summary,'整体结论',100)},shots};
    }else if(task==='persona-screening'){
      const m=obj(result.macro_evaluation,'受众结论');
      out={macro_evaluation:{target_persona:text(m.target_persona,'目标受众',500),safety_compliance_score:num(m.safety_compliance_score,'适配评分',0,100),overall_risk_level:choice(m.overall_risk_level,['低度受限','中度收敛','高度阻断','安全合规'],'受众风险'),cognitive_dimensions:list(m.cognitive_dimensions,'认知维度',3,4).map(d=>({dimension_name:text(d.dimension_name,'维度名称',100),tag:text(d.tag,'维度标签',100),risk_level:choice(d.risk_level,['高','中','低'],'维度风险'),description:text(d.description,'维度说明',1000)})),vulnerability_analysis:short(m.vulnerability_analysis,'脆弱性分析',80),compliance_guidelines:short(m.compliance_guidelines,'适配原则',50)},shot_evaluations:rows(result.shot_evaluations,input,'逐镜受众报告',(v,original)=>{
        const needs=yes(v.needs_revision,'修改标记');let adapted=null;
        if(needs){const a=obj(v.adapted_replacement,'适配改写');adapted={adapted_visual:text(a.adapted_visual,'具体画面改写',5000),adapted_dialogue:text(a.adapted_dialogue,'具体对白改写',3000)};if(adapted.adapted_visual===original.visual||(original.dialogue!=='无'&&adapted.adapted_dialogue===original.dialogue))fail('建议改写不能照抄原文');if(original.dialogue==='无'&&adapted.adapted_dialogue!=='无')fail('无对白镜头不能添加配音');}
        else if(v.adapted_replacement!==null)fail('无需修改时适配改写须为空');
        return {risk_type:choice(v.risk_type,['行为诱导与不良示范','恐惧过载与绝望施压','认知胁迫与虚假诱导','情感剥削与群体极化','尺度合规'],'风险类型'),risk_severity:choice(v.risk_severity,['高','中','低','安全'],'严重度'),violation_reason:text(v.violation_reason,'风险说明',1500),needs_revision:needs,adapted_replacement:adapted};
      })};
    }else{
      let next=1;const bounds=bgmBounds(input),seen=new Set();
      const segments=list(result.bgm_segments,'配乐段落',bounds.min,bounds.max).map(s=>{obj(s,'配乐段落');const key=text(s.segment_id,'配乐编号',60);if(seen.has(key))fail('配乐编号重复');seen.add(key);const range=list(s.shot_range,'配乐范围',2,2).map(v=>id(v,n));if(range[0]!==next||range[1]<range[0])fail('配乐须连续覆盖镜头且不能重叠');next=range[1]+1;return {segment_id:key,shot_range:range,genre:short(s.genre,'曲风',8),bpm:num(s.bpm,'BPM',20,300,true),key_instruments:strings(s.key_instruments,'主导音色',2,2,100),dramatic_purpose:short(s.dramatic_purpose,'配乐作用',12)};});
      if(next!==n+1)fail('配乐未覆盖完整分集');
      out={episode_audio_summary:short(result.episode_audio_summary,'声音总调性',15),acoustic_safety_notes:short(result.acoustic_safety_notes,'听觉准则',15),bgm_segments:segments,shot_audio_cues:rows(result.shot_audio_cues,input,'逐镜声音报告',(v,original)=>{
        const va=obj(v.emotion_va,'情绪坐标');let tts=null;
        if(original.dialogue==='无'){if(v.tts_guidance!==null)fail('无对白镜头的配音指导必须为空');}
        else{const t=obj(v.tts_guidance,'配音指导');if(typeof t.speed_rate!=='string'||!/^\d+(?:\.\d+)?x$/.test(t.speed_rate))fail('语速须为1.0x形式');num(parseFloat(t.speed_rate),'语速',0.5,2);tts={delivery_tone:short(t.delivery_tone,'发声状态',6),speed_rate:t.speed_rate,stress_words:strings(t.stress_words,'重音词',1,2,100)};if(tts.stress_words.some(w=>!original.dialogue.includes(w)))fail('重音词必须来自实际对白');}
        return {emotion_va:{valence:num(va.valence,'效价',-1,1),arousal:num(va.arousal,'唤醒度',0,1)},tts_guidance:tts,bgm_action:short(v.bgm_action,'配乐调度',4),sfx_cues:strings(v.sfx_cues,'音效',1,2,150),acoustic_safety_warning:v.acoustic_safety_warning===null?null:short(v.acoustic_safety_warning,'听觉建议',12)};
      })};
    }
    if(JSON.stringify(out).length>200000)fail('报告过长');return out;
  }
  function cleanReports(value){
    // Up to 300 episodes × 3 modules, plus eight historical revisions.
    return list(value||[],'历史报告',0,908).map(r=>{
      obj(r,'历史报告');choice(r.task,tasks,'分析类型');obj(r.source,'报告源资料');
      const input=r.source;if(JSON.stringify(input).length>180000)fail('报告源资料过长');
      if(input.episode!==r.episode)fail('报告与源资料的分集不一致');
      choice(input.source_kind,['storyboard','scenes'],'源资料类型');
      const ids=new Set();list(input.parsed_shots,'源镜头',1,40).forEach((s,i)=>{obj(s,'源镜头');if(s.shot_id!==i+1)fail('源镜头编号不连续');text(s.source_id,'源镜头ID',150);if(ids.has(s.source_id))fail('源镜头ID重复');ids.add(s.source_id);text(s.visual,'源画面',150000,true);text(s.dialogue,'源对白',50000);text(s.scene,'源场景',1000);text(s.duration,'源时长',30);});
      return {id:text(r.id,'报告ID',150),task:r.task,episode:num(r.episode,'分集编号',1,300,true),persona:text(r.persona||'','受众',2000,true),createdAt:text(r.createdAt,'创建时间',100),model:text(r.model||'DeepSeek','模型',100),promptVersion:text(r.promptVersion||version,'提示词版本',100),source:JSON.parse(JSON.stringify(input)),result:validate(r.task,r.result,input),usage:{total_tokens:num(r.usage?.total_tokens||0,'用量',0,1000000,true)}};
    });
  }
  function isStale(project,report){try{return JSON.stringify(source(project,report.episode))!==JSON.stringify(report.source);}catch{return true;}}
  function appendReport(previous,report){
    const added=cleanReports([report])[0],items=[...cleanReports(previous).filter(r=>r.id!==added.id),added];
    const latest=new Set();let history=0;
    // Keep every episode's latest report for every module, even in a long batch.
    return items.reverse().filter(r=>{const key=r.task+':'+r.episode;if(!latest.has(key)){latest.add(key);return true;}return history++<8;}).reverse();
  }
  globalThis.ReelMentor={tasks,labels,dimensions,version,source,bgmBounds,validate,cleanReports,appendReport,isStale};
})();

ReelMentor=globalThis.ReelMentor;

// reelmentor-ui.js
/* Read-only analysis reports. Creative source content is never overwritten. */
(() => {
  const R=globalThis.ReelMentor;
  function create({project,request,save,changed,render,toast,esc,button,download,ready}) {
    let task=R.tasks[0],episode=1,persona='普通成年观众',selected='',projectId='',controller=null,progress='',error='',notice='',entries=[],reuse=true;
    const ptxt=s=>`<p class="rm-text" translate="no">${esc(String(s??''))}</p>`;
    const tag=s=>`<span class="rm-tag">${esc(s)}</span>`;
    const episodes=p=>[...new Set([...p.bible.outlines.map(o=>o.number),...p.scripts.map(e=>e.number),...p.storyboards.map(b=>b.episode)])].sort((a,b)=>a-b);
    const title=(p,n)=>'第 '+n+' 集 · '+(p.bible.outlines.find(o=>o.number===n)?.title||p.scripts.find(e=>e.number===n)?.title||'未命名');
    function sync(){const p=project();if(projectId!==p.id){controller?.abort();controller=null;progress='';error='';notice='';selected='';entries=[];reuse=true;projectId=p.id;const numbers=episodes(p);episode=numbers.length>1?'all':numbers[0]||1;}return p;}
    function reports(p,n=episode){return (p.analysisReports||[]).filter(r=>r.task===task&&r.episode===n).slice().reverse();}
    function current(p){const items=reports(p);return items.find(r=>r.id===selected)||items[0];}
    function latest(p,n){return reports(p,n).find(r=>task!=='persona-screening'||r.persona===persona.trim());}
    function sources(p){return (episode==='all'?episodes(p):[episode]).map(number=>{try{return {number,source:R.source(p,number)};}catch(e){return {number,error:e.message};}});}
    function summaryText(r){if(r.task==='cognitive-guard')return r.result.synthesis.overall_risk_level+' · '+r.result.synthesis.audit_summary;if(r.task==='persona-screening')return r.result.macro_evaluation.overall_risk_level+' · 适配评分 '+r.result.macro_evaluation.safety_compliance_score+' / 100';return r.result.episode_audio_summary+' · '+r.result.acoustic_safety_notes;}
    const cmp=(label,before,after)=>`<div class="rm-compare"><div><h4>原${label}</h4>${ptxt(before)}</div><div><h4>建议${label}</h4>${ptxt(after)}</div></div>`;
    function reportView(report,p){
      const data=report.result,source=report.source,unit=source.source_kind==='storyboard'?'镜':'场';
      const stale=R.isStale(p,report);
      let summary='',rows=[];
      if(report.task==='cognitive-guard'){
        const s=data.synthesis,sy=s.synergy_evaluation;
        summary=`<div class="rm-summary"><strong>${esc(s.overall_risk_level)} · 整体评估</strong>${ptxt(s.audit_summary)}<details><summary>查看协同风险依据</summary>${tag(sy.synergy_type)} ${tag(sy.escalation_applied)}${ptxt(sy.rationale)}</details></div>`;
        rows=data.shots.map(r=>({id:r.shot_id,status:r.needs_revision?'有改写建议':'无需改写',body:ptxt(r.shot_diagnostic_verdict)+`<div class="rm-scores">${Object.entries(r.dimension_scores).map(([k,v])=>`<span>${esc(R.dimensions[k])}<b>${v}/5</b></span>`).join('')}</div>`+Object.entries(r.dimension_explanations).map(([k,v])=>`<p><strong>${esc(R.dimensions[k])}：</strong>${esc(v)}</p>`).join('')+(r.cross_modal_conflict_detected?ptxt('声画冲突：'+r.cross_modal_conflict_description):'')+r.violations.map(v=>ptxt(v)).join('')+(r.needs_revision?cmp('内容',source.parsed_shots[r.shot_id-1].visual+'\n对白：'+source.parsed_shots[r.shot_id-1].dialogue,r.safe_replacement):'')}));
      }else if(report.task==='persona-screening'){
        const m=data.macro_evaluation;
        summary=`<div class="rm-summary"><strong>${esc(m.target_persona)} · ${esc(m.overall_risk_level)}</strong><p>模型适配评分 ${esc(m.safety_compliance_score)} / 100</p>${ptxt(m.vulnerability_analysis)}${ptxt(m.compliance_guidelines)}<div class="rm-dimensions">${m.cognitive_dimensions.map(d=>`<section><strong>${esc(d.dimension_name)}</strong>${tag(d.risk_level)}${ptxt(d.tag+' · '+d.description)}</section>`).join('')}</div></div>`;
        rows=data.shot_evaluations.map(r=>({id:r.shot_id,status:r.risk_severity,body:ptxt(r.risk_type+'：'+r.violation_reason)+(r.needs_revision?cmp('画面',source.parsed_shots[r.shot_id-1].visual,r.adapted_replacement.adapted_visual)+cmp('对白',source.parsed_shots[r.shot_id-1].dialogue,r.adapted_replacement.adapted_dialogue):'')}));
      }else{
        summary=`<div class="rm-summary"><strong>${esc(data.episode_audio_summary)}</strong>${ptxt(data.acoustic_safety_notes)}<div class="rm-dimensions">${data.bgm_segments.map(s=>`<section><strong>第 ${s.shot_range[0]}–${s.shot_range[1]} ${unit}</strong>${ptxt(s.genre+' · '+s.bpm+' BPM')}${ptxt(s.key_instruments.join(' / '))}${ptxt(s.dramatic_purpose)}</section>`).join('')}</div></div>`;
        rows=data.shot_audio_cues.map(r=>({id:r.shot_id,status:r.bgm_action,body:`<p>情绪效价 ${r.emotion_va.valence} · 唤醒度 ${r.emotion_va.arousal}</p>`+(r.tts_guidance?ptxt('配音：'+r.tts_guidance.delivery_tone+' · '+r.tts_guidance.speed_rate)+ptxt('重音：'+r.tts_guidance.stress_words.join('、')):ptxt('无对白 · 不安排配音'))+ptxt('音效：'+r.sfx_cues.join(' / '))+(r.acoustic_safety_warning?ptxt('听觉建议：'+r.acoustic_safety_warning):'')}));
      }
      return `${stale?'<div class="notice warning" role="status">本集资料已变更，以下报告基于旧版本，请重新分析。</div>':''}<div class="rm-report-meta"><span>第 ${report.episode} 集 · ${esc(report.model)} · ${esc(new Date(report.createdAt).toLocaleString('zh-CN'))}</span>${button('导出报告 JSON','analysis-export','download','','data-report-id="'+esc(report.id)+'"')}</div>${report.persona?ptxt('本次受众：'+report.persona):''}${summary}${rows.map(r=>`<article class="rm-shot"><header><h3>第 ${r.id} ${unit} · ${esc(source.parsed_shots[r.id-1].scene)}</h3>${tag(r.status)}</header>${r.body}<details><summary>本次分析的源资料 · ${esc(source.parsed_shots[r.id-1].duration)}</summary>${ptxt(source.parsed_shots[r.id-1].visual)}${ptxt('对白：'+source.parsed_shots[r.id-1].dialogue)}</details></article>`).join('')}`;
    }
    function allReportsView(p,scope){
      const valid=scope.filter(s=>{const r=latest(p,s.number);return r&&!R.isStale(p,r);}).length;
      return `<section class="rm-all-reports" aria-label="全部剧本分析汇总"><div class="rm-report-meta"><h2>全部剧本 · 分析汇总</h2>${button('导出全部报告','analysis-export-all','download','',scope.some(s=>latest(p,s.number))?'':'disabled')}</div><p class="rm-coverage">当前内容已分析 ${valid} / ${scope.length} 集 · 按集完整复核，展开查看逐镜结论</p>${scope.map(s=>{
        const report=latest(p,s.number),entry=entries.find(e=>e.number===s.number);
        const status=entry?.status==='running'?'正在分析':entry?.status==='failed'?'分析未完成':s.error?'资料待补齐':report?(R.isStale(p,report)?'需重新分析':'已完成'):'等待分析';
        return `<details class="rm-episode-report" data-analysis-episode="${s.number}"><summary><span><strong>${esc(title(p,s.number))}</strong><span class="rm-episode-brief">${esc(report?summaryText(report):s.error||'完成后将在这里汇总分析结论')}</span></span>${tag(status)}</summary><div class="rm-episode-body">${entry?.error?`<p role="alert">${esc(entry.error)}</p>`:''}${report?reportView(report,p):ptxt(s.error||'本集尚未生成分析报告。')}</div></details>`;
      }).join('')}</section>`;
    }
    function view(){
      const p=sync(),all=episode==='all',scope=sources(p),items=all?[]:reports(p),report=all?null:current(p);
      const eligible=scope.filter(s=>s.source),count=eligible.reduce((n,s)=>n+s.source.parsed_shots.length,0),finished=entries.filter(e=>['done','reused'].includes(e.status)).length;
      const descriptions={'cognitive-guard':'区分剧情冲突与现实诱导，检查六个认知维度与声画冲突。','persona-screening':'按目标观众审视理解负担与内容尺度，提供具体的画面和对白改写。','audio-emotion':'按真实镜头顺序安排配乐、配音与音效，让声音服务剧情节奏。'};
      const scopeInfo=all?`共 ${scope.length} 集 · ${count} 个分镜 / 分场${eligible.length<scope.length?' · '+(scope.length-eligible.length)+' 集需补齐资料':''}`:eligible.length?`${count} ${eligible[0].source.source_kind==='storyboard'?'个分镜':'个分场（未拆分时长）'}${eligible[0].source.target_duration?' · 目标 '+eligible[0].source.target_duration+' 秒':''}`:scope[0]?.error||'暂无剧本';
      return `<div class="module-body rm-layout"><aside class="section-tree"><div class="tree-title"><strong>创作分析</strong></div>${R.tasks.map((k,i)=>`<button type="button" class="tree-button ${task===k?'active':''}" data-action="analysis-task" data-task="${k}" ${controller?'disabled':''}><span>${esc(R.labels[k])}</span><span>0${i+1}</span></button>`).join('')}<p class="rm-side-note">支持全部剧本分析<br>按集保存，汇总查看</p></aside><div class="rm-scroll"><div class="rm-content"><header class="rm-heading"><div><p>REELMENTOR · 创作辅助</p><h1>${esc(R.labels[task])}</h1><p>${esc(descriptions[task])}</p></div></header><section class="rm-controls" aria-label="分析设置"><div class="rm-fields"><label>分析范围<select data-analysis-field="episode" ${controller?'disabled':''}><option value="all" ${all?'selected':''}>全部剧本（${episodes(p).length} 集）</option>${episodes(p).map(n=>`<option value="${n}" ${n===episode?'selected':''}>${esc(title(p,n))}</option>`).join('')}</select></label>${task==='persona-screening'?`<label>目标受众<input data-analysis-field="persona" maxlength="2000" placeholder="例如：普通成年观众、未成年青少年" value="${esc(persona)}" ${controller?'disabled':''}></label>`:''}</div>${all?`<label class="rm-reuse"><input type="checkbox" data-analysis-field="reuse" ${reuse?'checked':''} ${controller?'disabled':''}>跳过已完成且内容未变的报告</label><p class="rm-scope-help">一次启动，按集分析并保存；停止或失败后可继续未完成部分。取消勾选可重新分析全部剧本。</p>`:''}<div class="rm-control-foot"><span>${esc(scopeInfo)}</span>${controller?button('停止分析','analysis-cancel'):button(all?'开始分析全部剧本':'开始分析','analysis-run','spark','primary',eligible.length?'':'disabled')}</div></section>${controller?`<div class="rm-progress" role="status" aria-live="polite">${all?`<strong>已完成 ${finished} / ${scope.length} 集</strong><div class="rm-progress-track" role="progressbar" aria-label="全部剧本分析进度" aria-valuemin="0" aria-valuemax="${scope.length}" aria-valuenow="${finished}"><span style="width:${scope.length?finished/scope.length*100:0}%"></span></div>`:''}${esc(progress||'正在读取剧本资料…')}</div>`:''}${error?`<div class="notice warning" role="alert">${esc(error)}</div>`:''}${notice?`<p class="rm-progress" role="status">${esc(notice)}</p>`:''}${items.length?`<label class="rm-history">已保存的报告<select data-analysis-field="report">${items.map(r=>`<option value="${esc(r.id)}" ${r.id===report?.id?'selected':''}>${esc(new Date(r.createdAt).toLocaleString('zh-CN'))}${r.persona?' · '+esc(r.persona):''}${R.isStale(p,r)?' · 资料已变更':''}</option>`).join('')}</select></label>`:''}${all?allReportsView(p,scope):report?reportView(report,p):`<div class="rm-empty"><h2>让故事更适合被看见</h2><p>选择全部剧本或单集并开始分析，逐镜结论和制作建议会显示在这里。</p></div>`}<p class="rm-footnote">结果为模型的创作建议，评分不代表实测结论。改写建议仅供预览，保留原剧本与分镜；声学规划不生成音频。保留各集三项分析的最新报告，以及最近 8 份历史报告，可导出留档。</p></div></div></div>`;
    }
    function change(el){
      if(controller)return;
      if(el.dataset.analysisField==='episode'){episode=el.value==='all'?'all':Number(el.value);selected='';entries=[];error='';notice='';render();}
      else if(el.dataset.analysisField==='report'){selected=el.value;render();}
      else if(el.dataset.analysisField==='persona'){persona=el.value;entries=[];error='';notice='';}
      else if(el.dataset.analysisField==='reuse')reuse=el.checked;
    }
    async function handle(action,el){
      if(action==='analysis-cancel'){controller?.abort();return;}
      if(action==='analysis-export'){const p=sync(),r=(p.analysisReports||[]).find(r=>r.id===el?.dataset?.reportId)||current(p);if(r)await download('第'+r.episode+'集-'+R.labels[r.task]+'.json',JSON.stringify(r,null,2));return;}
      if(action==='analysis-export-all'){
        const p=sync(),rows=episodes(p).map(number=>{const r=latest(p,number);return {episode:number,title:title(p,number),status:r?(R.isStale(p,r)?'stale':'complete'):'pending',report:r||null};});
        await download('全部剧本-'+R.labels[task]+'.json',JSON.stringify({scope:'all',task,projectName:p.name,persona:task==='persona-screening'?persona.trim():'',exportedAt:new Date().toISOString(),episodes:rows},null,2));return;
      }
      if(controller)return;
      if(action==='analysis-task'){if(R.tasks.includes(el.dataset.task)){task=el.dataset.task;selected='';entries=[];error='';notice='';render();}return;}
      if(action!=='analysis-run')return;
      const p=sync();if(!ready())return;
      const all=episode==='all',scope=sources(p);
      if(!scope.some(s=>s.source)){error=scope[0]?.error||'请先生成剧本。';render();return;}
      if(task==='persona-screening'&&!persona.trim()){error='请填写目标受众。';render();return;}
      const input=JSON.parse(JSON.stringify({...p,analysisReports:[],snapshots:[]})),analysisTask=task,profile=persona.trim();
      entries=scope.map(s=>({...s,status:s.error?'invalid':all&&reuse&&latest(p,s.number)&&!R.isStale(p,latest(p,s.number))?'reused':'pending'}));
      const pending=new AbortController();controller=pending;error='';notice='';progress='正在读取剧本资料…';render();
      let active=null;
      const stillHere=()=>controller===pending&&project().id===p.id;
      try{
        for(const entry of entries){
          if(pending.signal.aborted||!stillHere())return;
          if(entry.status!=='pending')continue;
          active=entry;entry.status='running';progress=title(p,entry.number)+' · 正在分析…';render();
          const job={task:analysisTask,episode:entry.number,personaProfile:profile};
          const response=await request(job,input,pending.signal,event=>{if(stillHere()){progress=title(p,entry.number)+' · '+event.message+(event.attempt&&event.maxAttempts?'（第 '+event.attempt+' / '+event.maxAttempts+' 轮）':'');render();}});
          if(pending.signal.aborted||!stillHere())return;
          const result=R.validate(job.task,response.data,entry.source);
          const report={id:'analysis-'+crypto.randomUUID(),task:job.task,episode:job.episode,persona:job.task==='persona-screening'?profile:'',createdAt:new Date().toISOString(),model:response.model||'DeepSeek',promptVersion:R.version,source:entry.source,result,usage:{total_tokens:response.usage?.total_tokens||0}};
          // Save each completed episode immediately; never overwrite creative edits.
          project().analysisReports=R.appendReport(project().analysisReports||[],report);
          selected=report.id;changed();progress=title(p,entry.number)+' · 正在保存报告…';render();
          const saved=await save();
          if(!stillHere())return;
          if(!saved)throw new Error('报告已生成，但项目保存未完成。请先恢复保存连接，再继续分析。');
          entry.status='done';active=null;render();
        }
        if(!stillHere())return;
        // A resumed run may only contain browser-cached reports after a failed save.
        if(all&&!entries.some(e=>e.status==='done')&&!await save())throw new Error('项目保存未完成，请恢复保存连接后继续。');
        if(!stillHere())return;
        const invalid=entries.filter(e=>e.status==='invalid');
        if(invalid.length)error=invalid.map(e=>title(p,e.number)+'：'+e.error).join('；');
        const completed=entries.filter(e=>['done','reused'].includes(e.status)).length;
        notice=all?`已完成 ${completed} / ${entries.length} 集分析，报告已汇总保存。${invalid.length?'补齐缺失资料后可继续。':''}`:'分析报告已保存';toast(notice);
      }catch(e){if(!pending.signal.aborted&&stillHere()){if(active){active.status='failed';active.error=e.message;}error=(active?title(p,active.number)+'：':'')+(e.message||'分析未完成，请重试。')+(all?' 已完成报告已保留，再次开始可继续未完成部分。':'');}}
      finally{if(controller===pending){if(pending.signal.aborted){if(active?.status==='running')active.status='pending';notice='分析已停止，已完成的报告已保留，可继续未完成部分。';}controller=null;progress='';render();}}
    }
    return {view,handle,change,dispose(){controller?.abort();controller=null;}};
  }
  globalThis.ReelMentorUI={create};
})();

ReelMentorUI=globalThis.ReelMentorUI;

// core.js
(() => {
  const clone=v=>JSON.parse(JSON.stringify(v));
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid=prefix=>prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
  function txt(v,max=50000){if(typeof v!=='string'||v.length>max)throw new Error('数据中的文字格式或长度不正确');return v;}
  function integer(v,min=0,max=1000000){if(!Number.isInteger(v)||v<min||v>max)throw new Error('数据中的数值不正确');return v;}
  function array(v,max=100){if(!Array.isArray(v)||v.length>max)throw new Error('数据列表缺失或超出数量限制');return v;}
  function record(v,keys,max=50000){if(!v||typeof v!=='object')throw new Error('缺少必要的数据');return Object.fromEntries(keys.map(k=>[k,txt(v[k],max)]));}
  function id(v){if(typeof v!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(v))throw new Error('数据标识符不正确');return v;}
  function unique(items,key){if(new Set(items.map(x=>x[key])).size!==items.length)throw new Error('数据中存在重复编号');return items;}
  function cleanDirectionOptions(value){
    if(!Array.isArray(value)||value.length!==3)throw new Error('必须生成三个完整的故事方向');
    const limits={title:100,angle:200,genre:100,tone:100,logline:300,story:1800,characters:1000,conflict:600,twist:600,ending:600,openingScene:1500};
    const result=value.map((v,i)=>({id:'direction-'+(i+1),...Object.fromEntries(Object.entries(limits).map(([key,max])=>{const text=txt(v?.[key],max).trim();if(!text)throw new Error('故事方向缺少 '+key);return [key,text];}))}));
    for(const key of ['title','angle','logline','conflict']){const normalized=result.map(v=>v[key].replace(/[\s\p{P}\p{S}]/gu,'').toLowerCase());if(new Set(normalized).size!==3)throw new Error('三个故事方向的标题、切入角度、梗概和冲突必须不同');}
    return result;
  }
  function cleanStoryDirections(value){
    if(value==null)return null;
    const candidates=cleanDirectionOptions(value.candidates),selectedId=txt(value.selectedId||'',100);
    if(selectedId&&!candidates.some(c=>c.id===selectedId))throw new Error('已选故事方向不存在');
    return {id:id(value.id),createdAt:txt(value.createdAt,100),instruction:txt(value.instruction,4000),episodeCount:integer(value.episodeCount,1,20),duration:value.duration===null?null:integer(value.duration,1,86400),...(value.duration!==null&&value.minSeconds!=null?{minSeconds:integer(value.minSeconds,5,Math.min(600,value.duration))}:{}),selectedId,candidates};
  }
  function cleanBible(b){
    const result={core:record(b?.core,['logline','story','genre','tone','theme']),world:record(b?.world,['era','locations','rules','facts']),structure:record(b?.structure,['mainline','opening','development','climax','ending'])};
    result.characters=unique(array(b.characters).map(c=>({id:id(c.id),...record(c,['name','role','goal','motivation','flaw','arc','relationships']),age:c.age==null?null:integer(c.age,0,9999),traits:array(c.traits||[],30).map(t=>txt(t,100)),background:txt(c.background||'')})),'id');
    result.outlines=unique(array(b.outlines,300).map((o,i)=>{if(o.number!==i+1)throw new Error('大纲集数必须连续编号');return {number:o.number,duration:o.duration===null?null:integer(o.duration,1,86400),...(o.duration!==null&&o.durationMin!=null?{durationMin:integer(o.durationMin,5,Math.min(o.duration,600))}:{}),...record(o,['title','goal','conflict','turn','hook'])};}),'number');
    return result;
  }
  function cleanScenes(scenes){return unique(array(scenes,100).map(s=>({id:id(s.id),heading:txt(s.heading,500),blocks:array(s.blocks,300).map(b=>{if(!['action','dialogue','character','parenthetical','transition','comment','subtitle'].includes(b.type))throw new Error('不支持的剧本段落类型');return {type:b.type,...record(b,['text','speaker','parenthetical'])};})})),'id');}
  function projectNaming(p,directions){
    const name=txt(p.name,200);
    // Older projects started with the first 18 characters of the original idea.
    const idea=directions?.instruction || p.bible?.core?.logline || '';
    const legacyAuto=name==='未命名项目'||name==='我的剧本'||name===idea.trim().slice(0,18);
    const nameSource=p.nameSource==='auto'||p.nameSource==='manual'?p.nameSource:legacyAuto?'auto':'manual';
    const selected=directions?.candidates.find(option=>option.id===directions.selectedId);
    return {name:nameSource==='auto'&&selected?selected.title:name,nameSource};
  }
  function cleanPayload(p){
    const revision=integer(p.revision,1),confirmedRevision=integer(p.confirmedRevision);
    if(confirmedRevision>revision)throw new Error('确认修订不能大于当前修订');
    if(!['进行中','已暂停','已完成'].includes(p.status))throw new Error('项目状态无效');
    const storyDirections=cleanStoryDirections(p.storyDirections);
    return {...projectNaming(p,storyDirections),audienceProfile:txt(p.audienceProfile||'普通成年观众',2000),visualStyle:txt(p.visualStyle||'写实电影感',200),aspectRatio:['9:16','16:9','1:1','4:3','3:4','21:9'].includes(p.aspectRatio)?p.aspectRatio:'9:16',status:p.status,revision,confirmedRevision,confirmedAt:txt(p.confirmedAt,100),bible:cleanBible(p.bible),confirmedBible:p.confirmedBible?cleanBible(p.confirmedBible):null,
      eventPlans:p.eventPlans?.length?globalThis.EventPlan.cleanPlans(p.eventPlans):[],
      scripts:unique(array(p.scripts,300).map(e=>({number:integer(e.number,1,300),title:txt(e.title,200),basedOnRevision:integer(e.basedOnRevision),scenes:cleanScenes(e.scenes)})),'number'),
      entities:unique(array(p.entities,500).map(e=>{if(!['角色','场景','道具'].includes(e.type)||!['待确认','已确认','已忽略'].includes(e.status))throw new Error('主体资料状态无效');return {...record(e,['name','description']),id:id(e.id),type:e.type,status:e.status};}),'id'),
      productions:array(p.productions,30).map(f=>({id:id(f.id),name:txt(f.name,200),createdAt:txt(f.createdAt,100),sourceRevision:integer(f.sourceRevision),entities:array(f.entities,500).map(e=>record(e,['name','description','type'])),shots:array(f.shots,3000).map(s=>({id:id(s.id),episode:integer(s.episode,1,300),...record(s,['heading','description','notes','status'])}))})),
      storyboards:unique(array(p.storyboards||[],300).map(b=>({episode:integer(b.episode,1,300),eventPlanKey:txt(b.eventPlanKey||'',100),targetDuration:b.targetDuration==null?null:integer(b.targetDuration,1,86400),sourceKey:txt(b.sourceKey,100),characterKey:txt(b.characterKey,100),visualStyle:txt(b.visualStyle,200),aspectRatio:txt(b.aspectRatio,20),generatedAt:txt(b.generatedAt,100),shots:unique(array(b.shots,120).map(s=>({id:id(s.id),number:integer(s.number,1,120),sceneId:id(s.sceneId),eventIds:array(s.eventIds||[],1200).map(v=>txt(v,200)),characterIds:array(s.characterIds,100).map(id),heading:txt(s.heading,500),script:txt(s.script,10000),notes:txt(s.notes,10000),duration:integer(s.duration,1,300),spokenText:s.spokenText==null?null:txt(s.spokenText,10000),imagePrompt:txt(s.imagePrompt,10000),videoPrompt:txt(s.videoPrompt,10000)})),'id')})),'episode'),
      novels:array(p.novels,50).map(n=>({id:id(n.id),...record(n,['name','style','content','createdAt'])})),storyDirections};
  }
  function cleanBatchRun(b){
    if(b==null)return null;
    if(!['scripts','boards'].includes(b.kind)||!['missing','all'].includes(b.mode)||!['running','stopped','failed','completed'].includes(b.status))throw new Error('批量任务状态无效');
    return {id:id(b.id),kind:b.kind,mode:b.mode,instruction:txt(b.instruction,4000),referenceKey:txt(b.referenceKey,100),snapshotId:b.snapshotId?id(b.snapshotId):'',status:b.status,createdAt:txt(b.createdAt,100),updatedAt:txt(b.updatedAt,100),entries:unique(array(b.entries,300).map(e=>{if(!['pending','running','done','skipped','failed'].includes(e.status))throw new Error('分集任务状态无效');return {number:integer(e.number,1,300),title:txt(e.title,200),duration:e.duration===null?null:integer(e.duration,1,86400),status:e.status,reason:txt(e.reason,200),error:txt(e.error,2000),resultKey:txt(e.resultKey,100)};}),'number')};
  }
  function cleanProject(p){return {id:id(p.id),createdAt:txt(p.createdAt,100),updatedAt:txt(p.updatedAt,100),...cleanPayload(p),analysisReports:p.analysisReports?.length?globalThis.ReelMentor.cleanReports(p.analysisReports):[],batchRun:cleanBatchRun(p.batchRun),snapshots:unique(array(p.snapshots,50).map(s=>({id:id(s.id),name:txt(s.name,200),createdAt:txt(s.createdAt,100),note:txt(s.note,1000),payload:cleanPayload(s.payload)})),'id')};}
  function cleanWorkspace(w){if(w?.schemaVersion!==1)throw new Error('不支持的备份版本');const projects=unique(array(w.projects,20).map(cleanProject),'id');if(!projects.length)throw new Error('工作区至少需要一个项目');return {schemaVersion:1,updatedAt:txt(w.updatedAt,100),activeId:projects.some(p=>p.id===w.activeId)?w.activeId:projects[0].id,locale:w.locale==='en'?'en':'zh',projects};}
  function markBibleEdit(p){if(p.revision===p.confirmedRevision)p.revision++;}
  function confirmBible(p){if(!p.bible.core.logline.trim()||!p.bible.core.story.trim())throw new Error('请先填写一句话梗概与核心故事');p.confirmedBible=cleanBible(p.bible);p.confirmedRevision=p.revision;p.confirmedAt=new Date().toISOString();}
  function snapshot(p,name,note='手动快照'){if(p.snapshots.length>=50)throw new Error('当前项目已有 50 个快照，请导出备份后新建项目继续创作');const entry={id:uid('version'),name:name.trim()||'未命名快照',createdAt:new Date().toISOString(),note,payload:cleanPayload(p)};p.snapshots.unshift(entry);return entry;}
  function restore(p,snapshotId){const version=p.snapshots.find(s=>s.id===snapshotId);if(!version)throw new Error('版本不存在');const payload=clone(version.payload);snapshot(p,'恢复前自动快照','恢复到「'+version.name+'」前的备份');Object.assign(p,cleanPayload(payload));}
  function blockText(block){return block.type==='dialogue'?[block.speaker,block.parenthetical?'（'+block.parenthetical+'）':'',block.text].filter(Boolean).join('\n'):block.type==='parenthetical'?'（'+block.text+'）':block.text;}
  function scenesFor(p,scope='all',episode=1,selected=[]){const chosen=p.scripts.filter(e=>scope!=='episode'||e.number===episode).map(e=>({...e,scenes:e.scenes.filter(s=>scope!=='scenes'||selected.includes(s.id))})).filter(e=>e.scenes.length);if(!chosen.length)throw new Error('导出范围没有内容，请先选择场景或填写剧本');return chosen;}
  function exportScript(p,format='txt',scope='all',episode=1,selected=[]){
    const chosen=scenesFor(p,scope,episode,selected),lines=[format==='fountain'?'Title: '+p.name:p.name,''];
    for(const e of chosen){lines.push(format==='fountain'?`# 第 ${e.number} 集 · ${e.title}`:`第 ${e.number} 集 · ${e.title}`,'');for(const [i,s] of e.scenes.entries()){
      if(format==='fountain'){
        const heading=s.heading.replace(/^外景\s*/,'EXT. ').replace(/^内景\s*/,'INT. ');
        lines.push(/^(EXT\.|INT\.)/.test(heading)?heading:'.'+heading,'');
        for(const b of s.blocks){if(b.type==='dialogue')lines.push(...(b.speaker?['@'+b.speaker]:[]),...(b.parenthetical?['('+b.parenthetical+')']:[]),b.text,'');else if(b.type==='character')lines.push('@'+b.text);else if(b.type==='parenthetical')lines.push('('+b.text+')');else if(b.type==='transition')lines.push('> '+b.text,'');else if(b.type==='comment')lines.push('[[ '+b.text+' ]]','');else if(b.type==='subtitle')lines.push('> '+b.text+' <','');else lines.push('!'+b.text,'');}
      }else{lines.push(`场景 ${String(i+1).padStart(2,'0')} · ${s.heading}`,'',...s.blocks.flatMap(b=>[blockText(b),'']));}
    }}return lines.join('\r\n');
  }
  function newProduction(p,name){const shots=p.scripts.flatMap(e=>e.scenes.map(s=>({id:uid('shot'),episode:e.number,heading:s.heading,description:s.blocks.map(blockText).join('\n\n'),notes:'',status:'待制作'})));if(!shots.length)throw new Error('当前剧本没有场景，请先编写剧本');if(p.productions.length>=30)throw new Error('每个剧本最多保留 30 个影视项目');const film={id:uid('film'),name:name.trim()||p.name+' · 影视制作',createdAt:new Date().toISOString(),sourceRevision:p.confirmedRevision,entities:p.entities.filter(e=>e.status!=='已忽略').map(({name,description,type})=>({name,description,type})),shots};p.productions.unshift(film);return film;}
  function syncEntities(p){let added=0;for(const c of p.bible.characters){const existing=p.entities.find(e=>e.type==='角色'&&e.name===c.name);const description=[c.role,c.goal,c.arc].filter(Boolean).join('；');if(existing){if(existing.status==='待确认')existing.description=description;}else{p.entities.push({id:uid('entity'),type:'角色',name:c.name,description,status:'待确认'});added++;}}return added;}
  const count=text=>Array.from(String(text).replace(/\s/g,'')).length;
  globalThis.SceneCore={clone,esc,uid,cleanBible,cleanScenes,cleanDirectionOptions,cleanStoryDirections,cleanProject,cleanWorkspace,cleanPayload,markBibleEdit,confirmBible,snapshot,restore,blockText,exportScript,newProduction,syncEntities,count};
})();

SceneCore=globalThis.SceneCore;

// event-plan.js
/* Episode preflight: source coverage, natural timing and explicit adaptation consent. */
(() => {
  'use strict';
  const C=globalThis.SceneCore;
  const hash=value=>{let n=2166136261;for(const c of JSON.stringify(value)){n=Math.imul(n^c.charCodeAt(0),16777619);}return (n>>>0).toString(16);};
  const text=(v,max=10000,empty=false)=>{if(typeof v!=='string'||v.length>max||(!empty&&!v.trim()))throw new Error('剧情事件的文字缺失或过长');return v;};
  const list=(v,max=1200)=>{if(!Array.isArray(v)||v.length>max)throw new Error('剧情事件列表无效');return v;};
  const range=v=>{if(!v||![v.min,v.max].every(n=>Number.isFinite(n)&&n>=0&&n<=600)||v.min>v.max)throw new Error('事件时长区间无效');return {min:v.min,max:v.max};};
  const round=n=>Math.ceil(n*10)/10;
  const units=t=>(t.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{N}]/gu)||[]).length+(t.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)||[]).length*2;
  const speech=t=>({min:round(units(t)/4),max:round(units(t)/3+(t.match(/[，。！？；,.!?;]/g)||[]).length*.2)});
  const sourceKey=(p,n)=>hash({episode:p.scripts.find(e=>e.number===n),outline:p.bible.outlines.find(e=>e.number===n),bible:p.confirmedBible,characters:p.bible.characters,revision:p.revision,style:p.visualStyle,ratio:p.aspectRatio});
  function sources(p,n){
    const e=p.scripts.find(e=>e.number===n);if(!e)throw new Error('本集不存在');
    const rows=[];
    for(const scene of e.scenes)for(const [bi,b]of scene.blocks.entries()){
      // Retain punctuation and every original character; dialogue stays whole.
      const parts=b.type==='action'?b.text.match(/[^，,。！？!?；;\n]+[，,。！？!?；;\n]*|[，,。！？!?；;\n]+/g)||[]:[b.text];
      parts.forEach((value,i)=>{if(value.trim())rows.push({id:scene.id+'-b'+bi+'-'+i,sceneId:scene.id,heading:scene.heading,type:b.type,text:value,speaker:b.speaker,parenthetical:b.parenthetical});});
    }
    if(!rows.some(s=>['action','dialogue'].includes(s.type)))throw new Error('请先填写本集剧本正文');
    if(rows.length>1200)throw new Error('本集超过 1200 个原文片段，请先拆分集数');
    return rows;
  }
  const visible=s=>!['comment','character','parenthetical'].includes(s.type);
  function cleanEvent(v){return {sourceId:text(v.sourceId,200),title:text(v.title,300),actionSeconds:range(v.actionSeconds),rationale:text(v.rationale,2000),startState:text(v.startState,2000),endState:text(v.endState,2000),dependsOn:list(v.dependsOn,100).map(id=>text(id,200)),overlapPrevious:v.overlapPrevious===true,critical:v.critical===true};}
  function cleanProposal(v){if(!v)return null;return {title:text(v.title,200),continuity:text(v.continuity,5000),changes:list(v.changes).map(c=>({sourceId:text(c.sourceId,200),replacement:text(c.replacement,10000,true),reason:text(c.reason,2000),impact:text(c.impact,2000),startState:text(c.startState,2000),endState:text(c.endState,2000),actionSeconds:range(c.actionSeconds)}))};}
  function cleanPlans(value=[]){return list(value,300).map(p=>{
    if(!Number.isInteger(p.episode)||p.episode<1||p.episode>300)throw new Error('事件方案集号无效');
    return {episode:p.episode,sourceKey:text(p.sourceKey,100),createdAt:text(p.createdAt,100),events:list(p.events).map(cleanEvent),proposal:cleanProposal(p.proposal),...(Number.isInteger(p.proposalTarget)&&p.proposalTarget>=5&&p.proposalTarget<=600?{proposalTarget:p.proposalTarget}:{}),...(p.proposalMinSeconds!=null?{proposalMinSeconds:durationRange(p.proposalTarget,p.proposalMinSeconds).min}:{}),selection:p.selection?{mode:['original','adapted'].includes(p.selection.mode)?p.selection.mode:'',target:p.selection.target,...(p.selection.minSeconds!=null?{minSeconds:durationRange(p.selection.target,p.selection.minSeconds).min}:{}),planKey:text(p.selection.planKey,100),confirmedAt:text(p.selection.confirmedAt,100)}:null};
  });}
  const find=(p,n)=>p.eventPlans?.find(e=>e.episode===n);
  const current=(p,n)=>{const plan=find(p,n);return plan&&plan.sourceKey===sourceKey(p,n)?plan:null;};
  const planKey=plan=>hash({sourceKey:plan.sourceKey,events:plan.events,proposal:plan.proposal});
  const confirmationKey=(p,n)=>{const plan=current(p,n);return plan?.selection?hash({plan:planKey(plan),mode:plan.selection.mode,target:plan.selection.target,...(plan.selection.minSeconds!=null&&plan.selection.minSeconds!==plan.selection.target?{minSeconds:plan.selection.minSeconds}:{})}):'';};
  function validateAnalysis(p,n,value){
    const src=sources(p,n),events=list(value).map(cleanEvent);
    if(events.length!==src.length||events.some((e,i)=>e.sourceId!==src[i].id))throw new Error('事件拆解必须按原文顺序逐项覆盖全部片段，不得跳过、合并或新增原文编号');
    events.forEach((e,i)=>{
      if(new Set(e.dependsOn).size!==e.dependsOn.length||e.dependsOn.some(id=>!src.slice(0,i).some(s=>s.id===id)))throw new Error('事件因果依赖只能引用前文，不能循环或引用未知事件');
      if(src[i].type==='action'&&e.actionSeconds.min<.5)throw new Error('可见动作必须估算自然执行时间，不能按零秒省略');
      if(e.overlapPrevious&&!(i>0&&src[i].type==='dialogue'&&src[i-1].type==='action'&&src[i].sceneId===src[i-1].sceneId))throw new Error('仅紧接同场动作的对白可与前一动作并行，其他事件按顺序计时');
    });return events;
  }
  function effective(p,n,mode='original',proposal=current(p,n)?.proposal){
    const plan=current(p,n);if(!plan)throw new Error('请先完整拆解剧情事件并估算时长');
    return sources(p,n).map((s,i)=>{
      const e=plan.events[i];if(!e||e.sourceId!==s.id)throw new Error('原稿已变化，请重新拆解事件');
      const change=mode==='adapted'?proposal?.changes.find(c=>c.sourceId===s.id):null;
      return {...s,...e,...(change?{text:change.replacement,actionSeconds:change.actionSeconds,startState:change.startState,endState:change.endState,overlapPrevious:false}:{}),originalText:s.text};
    });
  }
  function estimate(p,n,mode='original',proposal){
    const rows=effective(p,n,mode,proposal);let min=0,max=0,previous=null;
    const events=rows.map(e=>{
      const voice=e.type==='dialogue'&&e.text.trim()?speech(e.text):{min:0,max:0};
      const duration=!visible(e)||!e.text.trim()?{min:0,max:0}:{min:Math.max(e.actionSeconds.min,voice.min),max:Math.max(e.actionSeconds.max,voice.max)};
      const overlap=e.overlapPrevious&&previous?.text.trim()&&e.text.trim();
      min+=overlap?Math.max(0,duration.min-previous.duration.min):duration.min;
      max+=overlap?Math.max(0,duration.max-previous.duration.max):duration.max;
      const row={...e,duration,overlap};previous=row;return row;
    });
    const sceneCount=new Set(events.filter(e=>visible(e)&&e.text.trim()).map(e=>e.sceneId)).size;
    const lower=Math.max(5,sceneCount*5,Math.ceil(round(min)));
    const upper=Math.max(lower,Math.ceil(round(max)));
    const recommendedRange=lower>600?null:{min:lower,max:Math.min(600,Math.max(lower+1,upper))};
    return {min:round(min),max:round(max),recommended:upper,recommendedRange,events};
  }
  function suggestedRange(p,n,timing=estimate(p,n)){
    const plan=current(p,n),outline=p.bible.outlines.find(o=>o.number===n);
    if(plan?.selection)return {min:plan.selection.minSeconds??plan.selection.target,max:plan.selection.target};
    if(plan?.proposalTarget!=null)return {min:plan.proposalMinSeconds??outline?.durationMin??5,max:plan.proposalTarget};
    if(outline?.duration!=null)return {min:outline.durationMin??5,max:outline.duration};
    return timing.recommendedRange;
  }
  function planningTarget(p,n,requested){
    const saved=current(p,n);
    const target=requested??saved?.selection?.target??saved?.proposalTarget??p.bible.outlines.find(o=>o.number===n)?.duration;
    if(!Number.isInteger(target)||target<5||target>600)throw new Error('请输入 5–600 之间的整数秒数作为本集规划目标');
    return target;
  }
  function durationRange(max,min=max){
    if(![min,max].every(n=>Number.isInteger(n)&&n>=5&&n<=600)||min>max)
      throw new Error('成片时长范围须为 5–600 秒整数，最短时长不能超过最长时长');
    return {min,max};
  }
  function rangeLabel(min,max){return min===max?String(max):min+'–'+max;}
  function timingFit(timing,target,minTarget=target){
    durationRange(target,minTarget);
    const scenes=new Set(timing.events.filter(e=>visible(e)&&e.text.trim()).map(e=>e.sceneId)).size;
    const minimum=Math.max(5,scenes*5,Math.ceil(timing.min));
    if(target<minimum)return {direction:'shorten',difference:minimum-target,minimum};
    if(minTarget>timing.recommended)return {direction:'expand',difference:Math.round((minTarget-timing.max)*10)/10,minimum};
    return {direction:'within',difference:0,minimum};
  }
  function validateProposal(p,n,value,requested,minSeconds=requested){
    const plan=current(p,n);if(!plan)throw new Error('请先拆解原稿事件');
    const proposal=cleanProposal(value),rows=effective(p,n),ids=new Set();
    if(!proposal.changes.length)throw new Error('改编方案必须明确列出修改项');
    for(const c of proposal.changes){
      const e=rows.find(e=>e.id===c.sourceId);if(!e||ids.has(c.sourceId))throw new Error('改编引用了未知或重复事件');ids.add(c.sourceId);
      if(e.text===c.replacement)throw new Error('改编前后正文相同，不能算作改编');
      if(!c.replacement.trim()&&(c.actionSeconds.min||c.actionSeconds.max))throw new Error('省略事件的时长应为零');
      if(c.replacement.trim()&&e.type==='action'&&c.actionSeconds.min<.5)throw new Error('保留的动作不能估算为零秒');
    }
    // A reviewable draft can still exceed the target. Only explicit confirmation
    // gates production on the user's selected duration; never discard useful edits.
    const timing=estimate(p,n,'adapted',proposal);
    if(!timing.events.some(e=>visible(e)&&e.text.trim()))throw new Error('改编不能删掉全部剧情');
    if(requested!=null){
      const target=planningTarget(p,n,requested),original=estimate(p,n);
      durationRange(target,minSeconds);
      if(original.recommended<minSeconds){
        if(proposal.changes.some(c=>!c.replacement.trim()&&visible(rows.find(row=>row.id===c.sourceId))))throw new Error('原稿偏短，扩写必须保留原文事件。请为已有事件补充具体可拍的动作、反应和衔接。');
        if(timing.max<=original.max)throw new Error('原稿预计最多 '+original.max+' 秒，本次改编只有 '+timing.max+' 秒。请向 '+target+' 秒目标扩写，不能继续压缩原稿。');
      }
    }
    return proposal;
  }
  function confirm(p,n,mode,target,minSeconds=target){
    const plan=current(p,n);if(!plan)throw new Error('原稿已变化，请重新拆解和估时');
    validateAnalysis(p,n,plan.events);
    if(!['original','adapted'].includes(mode)||mode==='adapted'&&!plan.proposal)throw new Error('请选择具体方案后确认');
    if(!Number.isInteger(target)||target<5||target>600)throw new Error('本集拍摄目标需为 5–600 秒；更长内容请先拆分集数');
    if(mode==='adapted')validateProposal(p,n,plan.proposal);
    const timing=estimate(p,n,mode);
    const fit=timingFit(timing,target,minSeconds);
    if(fit.direction==='shorten')throw new Error('完整呈现预计至少需要 '+fit.minimum+' 秒；请延长目标或先确认明确的改编方案');
    if(fit.direction==='expand'&&(minSeconds<target||mode==='adapted'&&estimate(p,n).recommended<target))throw new Error('所选版本预计最多 '+timing.max+' 秒，距 '+minSeconds+' 秒下限仍差 '+fit.difference+' 秒；请重新拟定扩写或调整确认时长');
    plan.selection={mode,target,...(minSeconds!==target?{minSeconds}:{}),planKey:planKey(plan),confirmedAt:new Date().toISOString()};return plan;
  }
  function status(p,n){
    const plan=current(p,n),s=plan?.selection;
    if(!plan)return {ready:false,message:find(p,n)?'原稿或目标已变化，请重新拆解剧情事件并确认':'请先拆解剧情事件、估算时长并确认拍摄方案'};
    if(!s||s.planKey!==planKey(plan))return {ready:false,message:'请先确认事件与时长方案，再生成分镜或视频'};
    try{const copy=C.clone(p);confirm(copy,n,s.mode,s.target,s.minSeconds);}catch(e){return {ready:false,message:e.message};}
    return {ready:true,plan,selection:s};
  }
  function requireConfirmed(p,n){const s=status(p,n);if(!s.ready)throw new Error('第 '+n+' 集：'+s.message);return s;}
  function episode(p,n){
    const {selection}=requireConfirmed(p,n),original=p.scripts.find(e=>e.number===n),rows=effective(p,n,selection.mode);
    return {...C.clone(original),scenes:original.scenes.map(s=>({...s,blocks:rows.filter(e=>e.sceneId===s.id&&e.text.trim()).map(e=>({type:e.type,text:e.text,speaker:e.speaker,parenthetical:e.parenthetical}))})).filter(s=>s.blocks.some(b=>!['comment','character','parenthetical'].includes(b.type)&&b.text.trim()))};
  }
  function validateBoards(p,n,shots){
    const {selection}=requireConfirmed(p,n),events=effective(p,n,selection.mode).filter(e=>visible(e)&&e.text.trim()),covered=new Set();let last=-1;
    for(const shot of shots){
      if(!Array.isArray(shot.eventIds)||!shot.eventIds.length||new Set(shot.eventIds).size!==shot.eventIds.length)throw new Error('每镜必须填写对应的剧情事件编号 eventIds');
      for(const id of shot.eventIds){const index=events.findIndex(e=>e.id===id);if(index<0||index<last||events[index].sceneId!==shot.sceneId)throw new Error('分镜事件引用或因果顺序错误');last=index;covered.add(id);}
    }
    const missing=events.filter(e=>!covered.has(e.id));if(missing.length)throw new Error('分镜遗漏已确认的剧情事件：'+missing.map(e=>e.title).join('、'));
    const normalize=s=>s.normalize('NFKC').replace(/[\p{P}\p{Z}\s]/gu,'');
    if(normalize(events.filter(e=>e.type==='dialogue').map(e=>e.text).join(''))!==normalize(shots.map(s=>s.spokenText).join('')))throw new Error('分镜对白必须按顺序完整保留已确认版本；不得擅自删改台词，请返回改编确认');
  }
  function apply(p,job,value){
    const next=C.clone(p);next.eventPlans=next.eventPlans||[];
    if(job.task==='event-plan'){
      const events=validateAnalysis(p,job.episode,value);next.eventPlans=next.eventPlans.filter(e=>e.episode!==job.episode).concat({episode:job.episode,sourceKey:sourceKey(p,job.episode),createdAt:new Date().toISOString(),events,proposal:null,selection:null});
    }else{
      const target=planningTarget(p,job.episode,job.targetSeconds);
      const proposal=validateProposal(p,job.episode,value,target,job.minSeconds),plan=current(next,job.episode);
      plan.proposal=proposal;plan.proposalTarget=target;plan.proposalMinSeconds=job.minSeconds;plan.selection=null;
    }
    return next;
  }
  const schema={sourceId:'逐字引用原文片段 id',title:'本事件的完整动作或信息',actionSeconds:{min:2,max:4},rationale:'自然执行时长依据；对白时长由系统另行估算',startState:'人物位置、服装、手持道具及数量等起点状态',endState:'本事件完成后的具体状态',dependsOn:['依赖的前文事件 id'],overlapPrevious:false,critical:true};
  function prepare(p,job){
    if(!p.confirmedBible||p.revision!==p.confirmedRevision)throw new Error('请先确认当前故事与人物设定');
    const context={episode:p.scripts.find(e=>e.number===job.episode),sourceSegments:sources(p,job.episode),targetSeconds:p.bible.outlines.find(o=>o.number===job.episode)?.duration,characters:p.bible.characters};
    if(job.task==='event-plan')return {context,schema:[schema],rules:'先完整拆出剧情事件，再估算自然执行时长。本阶段禁止为了目标秒数删改原文。按 sourceSegments 顺序逐项返回，每个原文 id 恰好一项；一个片段含多步动作时 title 必须完整列出，actionSeconds 必须累计全部先后动作，不得只估主要动作。逐项写人物、道具、位置的开始与结束状态，以及前文因果依赖。actionSeconds 是可见动作/反应/转场的估计区间，不含对白朗读时间；系统会另外计算对白，两者同项同时发生取较大值。只有当前对白确实与紧邻的同场动作同时发生时 overlapPrevious=true，rationale 明确理由；其他事件依次累加。注释、角色名和纯表演括注可为零秒，但不能把必要动作当背景而归零。关键铺垫、道具转移、人物动机与结果都保留。实际配音/成片尚未测量，估算不得伪称精确测量。'};
    const plan=current(p,job.episode);if(!plan)throw new Error('请先完成事件拆解');
    const timing=estimate(p,job.episode);
    const target=planningTarget(p,job.episode,job.targetSeconds);
    context.targetSeconds=target;
    const minSeconds=job.minSeconds??target;
    context.durationRange=durationRange(target,minSeconds);
    const direction=timingFit(timing,target,minSeconds).direction,expand=direction==='expand';
    const timingInstruction=expand?
      '当前原稿自然时长偏短。为已有事件编写更完整的可拍动作、对白反应和交接过程，保留所有原文事件和故事走向。不能删去气氛和动作，也不能用空等、慢放或虚报秒数填时。':
      direction==='shorten'?'原稿超时，请提出具体压缩方案，保留核心因果。':'目标处于原稿的自然时长范围，保留原有节奏，仅调整有必要的表演细节。';
    context.timingDirection=direction;
    context.upperBoundChangeSeconds=direction==='expand'?Number((minSeconds-timing.max).toFixed(1)):direction==='shorten'?Number((target-timing.min).toFixed(1)):0;
    return {context:{...context,events:timing.events,originalTiming:{min:timing.min,max:timing.max,recommendedRange:timing.recommendedRange},previousProposal:plan.proposal,previousTiming:plan.proposal?((t)=>({min:t.min,max:t.max,recommendedRange:t.recommendedRange}))(estimate(p,job.episode,'adapted')):null},schema:{title:'明确的改编方案名称',continuity:'逐条说明如何保留因果、人物动机、道具转移及前后状态',changes:[{sourceId:'原事件 id',replacement:'改编后的完整片段；省略则留空',reason:'为什么修改，新增或节省多少表演时间',impact:'失去哪些信息，哪些保留事件补足铺垫及衔接',startState:'改编后的起点',endState:'改编后的终点',actionSeconds:{min:1,max:2}}]},rules:timingInstruction+' 针对 durationRange 重新规划，总长落入范围即可，列出实际变化。不得直接修改原稿、确认或生成分镜。保留核心情节、因果与人物动机；必要准备动作不能凭空已经完成，删减后的依赖必须在其他保留事件中合理补足，continuity 明确说明。不新增原文 id，不改变对白说话人。replacement 是完整替换文本，不是修改指令；省略事件留空并明确影响，actionSeconds 的 min/max 均为 0，startState/endState 仍须说明省略后由谁承接起止状态。只改标注的事件，其余逐字保留。系统按每秒 3–4 字当量加标点停顿估算对白，再与可见动作逐项累计；尽量使保守上限适合 targetSeconds。禁止通过加快语速、缩短数字或虚报零秒制造可行方案。如果合理改编后仍超时，也应完整返回具体改编草案，并在 continuity 说明需要延长或拆集，不能为了凑时长破坏核心因果。系统会展示剩余超时，交由用户决定。按原稿未变事件的时长和修改项重新求和，扩写时给出可信的自然时间区间，使自然时间估算与允许范围相交；可执行动作须足以支撑目标时长，为新增的时间安排可执行的内容。不要因为先前草案误删就继续删。若有 previousProposal，纠正其超时或不足，返回相对原稿的完整 changes，不能只返回相对上次草案的增量。'};
  }
  globalThis.EventPlan={durationRange,rangeLabel,timingFit,suggestedRange,planningTarget,sources,sourceKey,cleanPlans,current,find,planKey,confirmationKey,validateAnalysis,validateProposal,effective,estimate,confirm,status,requireConfirmed,episode,validateBoards,apply,prepare,visible};
})();

EventPlan=globalThis.EventPlan;

// event-plan-ui.js
(() => {
  'use strict';
  const E=globalThis.EventPlan,C=globalThis.SceneCore,esc=C.esc;
  let host,number=1,controller=null,pending=false,forBoards=false;
  const dialog=document.getElementById('dialog');
  const btn=(label,action,extra='')=>`<button type="button" class="button${action==='confirm-boards'?' primary':''}" data-action="event-${action}" ${extra}>${label}</button>`;
  const seconds=t=>`${t.min}–${t.max} 秒`;
  function timingMessage(timing,target,minSeconds=target){
    const fit=E.timingFit(timing,target,minSeconds),label=E.rangeLabel(minSeconds,target);
    if(fit.direction==='shorten')return '草案已生成，但仍比 '+target+' 秒目标多至少 '+fit.difference+' 秒。可以重新拟定或调整目标。';
    if(fit.direction==='expand')return '按自然估算上限，距 '+minSeconds+' 秒目标还差 '+fit.difference+' 秒。请重新规划以补充动作和反应，或采用较短时长。';
    return '自然时长估算与 '+label+' 秒目标相符，可按剧情需要分配镜头。';
  }
  const round=n=>Math.round(n*10)/10;
  function originalNotice(timing,target,minSeconds=target){
    const fit=E.timingFit(timing,target,minSeconds);
    if(fit.direction==='shorten')return '完整呈现预计至少 '+fit.minimum+' 秒，比当前目标多 '+fit.difference+' 秒。请延长目标，或审阅具体改编后再确认。';
    if(fit.direction==='expand')return '按原稿估算上限，距目标约差 '+fit.difference+' 秒。重新拟定可为已有剧情补充动作和反应。';
    return '原稿的自然时长估算接近当前目标。';
  }
  function proposalContent(p,plan,timing,target,minSeconds){
    const adapted=E.estimate(p,number,'adapted'),delta=round(adapted.max-timing.max);
    const preview=p.scripts.find(e=>e.number===number).scenes.map(scene=>{
      const events=adapted.events.filter(e=>e.sceneId===scene.id&&E.visible(e)&&e.text.trim());
      return events.length?`<article class="event-plan-card"><h4>${esc(scene.heading)}</h4>${events.map(e=>`<p>${e.type==='dialogue'?`<b>${esc(e.speaker||'未注明说话人')}${e.parenthetical?'（'+esc(e.parenthetical)+'）':''}：</b>`:''}${esc(e.text)}</p>`).join('')}</article>`:'';
    }).join('');
    return `<section class="event-plan-proposal" tabindex="-1"><h3>具体改编方案：${esc(plan.proposal.title)}</h3><p>改编后预计 ${seconds(adapted)}，较原稿估计上限${delta>=0?'增加':'减少'} ${Math.abs(delta)} 秒。</p><div data-event-proposal-gap class="notice">${esc(timingMessage(adapted,target,minSeconds))}</div><details class="event-plan-preview" open><summary>改编后的完整拍摄稿（待确认）</summary><div class="event-plan-list">${preview}</div></details><details class="event-plan-changes"><summary>逐项修改对照与原因（${plan.proposal.changes.length} 项）</summary><p>未列出的事件逐字保留。</p><div class="event-plan-list">`+plan.proposal.changes.map(c=>{const e=timing.events.find(e=>e.id===c.sourceId);return `<article class="event-plan-card"><strong>${esc(e.title)}</strong><div class="event-plan-diff"><div><b>原文</b><p>${esc(e.originalText)}</p></div><div><b>${c.replacement.trim()?'改编后':'建议省略'}</b><p>${esc(c.replacement)||'删除此段'}</p></div></div><p><b>原因：</b>${esc(c.reason)}</p><p><b>剧情及衔接影响：</b>${esc(c.impact)}</p></article>`;}).join('')+`</div></details><div class="notice"><b>因果与衔接处理</b><p>${esc(plan.proposal.continuity)}</p></div>${btn('选用此改编，保留输入的时长范围','select-adapted')}${adapted.recommendedRange?btn('采用改编建议范围 '+seconds(adapted.recommendedRange),'extend-adapted'):''}</section>`;
  }
  function content(){
    const p=host.project(),plan=E.current(p,number),state=E.status(p,number);
    let html=`<p>第 ${number} 集 · ${esc(p.scripts.find(e=>e.number===number)?.title||'剧本')}</p><div data-event-message role="status"></div>`;
    if(!plan)return html+`<div class="notice warning">${esc(state.message)}</div><p>逐项读取全部原文，记录动作、对白、因果依赖和人物道具的起止状态。</p>`+btn('完整拆解剧情并估算时长','analyze');
    const timing=E.estimate(p,number),range=E.suggestedRange(p,number,timing);
    if(!range)return html+'<p>本集原稿预计 '+seconds(timing)+'，超过单集分镜工具支持的 600 秒。请先在剧本中按剧情转折拆集，再估算时长。</p>';
    const {min:minSeconds,max:target}=range;
    html+=`<div class="event-plan-summary"><strong>原稿预计 ${seconds(timing)}</strong><span data-event-goal>当前目标 ${E.rangeLabel(minSeconds,target)} 秒</span><span>${new Set(timing.events.map(e=>e.sceneId)).size} 场 · ${timing.events.length} 个原文事件全部登记</span></div>`;
    html+=`<div class="notice subtle" data-event-original-gap>${esc(originalNotice(timing,target,minSeconds))}</div>`;
    const actions=btn(plan.proposal?'重新拟定改编方案':'拟定改编方案','adapt')+btn('重新估算','analyze');
    html+=forBoards&&E.timingFit(timing,target,minSeconds).direction==='within'?`<details><summary>调整剧情或重新估时</summary><div class="card-actions">${actions}</div></details>`:`<div class="card-actions">${actions}</div>`;
    if(plan.proposal)html+=proposalContent(p,plan,timing,target,minSeconds);
    html+=`<details><summary>逐项核对原文、事件与时长（${timing.events.length} 项）</summary><div class="event-plan-list">`;
    html+=timing.events.map((e,i)=>`<article class="event-plan-card"><strong>${i+1}. ${esc(e.title)}${e.critical?' · 关键事件':''}</strong><p class="muted">${esc(e.heading)}${e.speaker?' · '+esc(e.speaker):''} · ${seconds(e.duration)}${e.overlap?'（与前一动作并行）':''}</p><blockquote>${esc(e.originalText)}</blockquote><p>${esc(e.rationale)}</p><p><b>起点：</b>${esc(e.startState)}<br><b>终点：</b>${esc(e.endState)}</p>${e.dependsOn.length?`<p>前置事件：${esc(e.dependsOn.map(id=>timing.events.findIndex(x=>x.id===id)+1).join('、'))}</p>`:''}</article>`).join('')+'</div></details>';
    html+=`<div class="event-plan-choice"><label for="event-mode">采用哪个拍摄版本</label><select id="event-mode"><option value="original" ${plan.selection?.mode!=='adapted'?'selected':''}>完整保留原稿</option>${plan.proposal?`<option value="adapted" ${plan.selection?.mode==='adapted'?'selected':''}>采用上方明确列出的改编</option>`:''}</select><label for="event-min">成片最短时长（秒）</label><input id="event-min" type="number" min="5" max="600" step="1" value="${minSeconds}"><label for="event-target">成片最长时长（秒）</label><input id="event-target" type="number" min="5" max="600" step="1" value="${target}">${timing.recommendedRange?btn('采用原稿建议范围 '+seconds(timing.recommendedRange),'extend'):''}</div><div data-event-choice-state class="notice ${state.ready?'':'warning'}">${state.ready?'已确认'+(state.selection.mode==='original'?'完整原稿':'改编版')+' · '+E.rangeLabel(state.selection.minSeconds??state.selection.target,state.selection.target)+' 秒，可继续生成分镜。':esc(state.message)}</div>`;
    return html;
  }
  function open(n=host.episode(),generatingBoards=false){
    if(pending)return;number=n;forBoards=generatingBoards;
    const ready=E.status(host.project(),number).ready,plan=E.current(host.project(),number);
    const confirmAction=forBoards?btn('确认并生成本集分镜','confirm-boards'):btn('保存版本与时长','confirm');
    host.show('剧本版本与时长',content(),btn('关闭','close')+(plan&&E.suggestedRange(host.project(),n)?confirmAction:'')+(ready&&!forBoards?btn('继续生成分镜','continue'):''));
  }
  async function startBoards(n){
    if(pending||!host.ready())return;
    if(E.status(host.project(),n).ready)return host.boards(n,true);
    open(n,true);
    if(!E.current(host.project(),n))await generate('event-plan');
  }
  function message(value,error=false){const el=document.querySelector('[data-event-message]');if(el){el.className='notice '+(error?'warning':'subtle');el.textContent=value;}}
  async function generate(task){
    if(pending||!host.ready())return;
    const p=C.clone(host.project()),key=E.sourceKey(p,number),planKey=E.current(p,number)?E.planKey(E.current(p,number)):null,run=new AbortController();
    let requested,minSeconds;
    if(task==='event-adaptation'){
      try{requested=E.planningTarget(p,number,Number(document.querySelector('#event-target').value));minSeconds=Number(document.querySelector('#event-min').value);E.durationRange(requested,minSeconds);}
      catch(error){message(error.message,true);return;}
    }
    const timeout=host.timeout?.(),limit=Number.isFinite(timeout)?`单次模型响应等待上限 ${Math.ceil(timeout/60)} 分钟；需要修正时会显示轮次。`:'完成时间取决于剧本长度和模型响应。';
    host.show(task==='event-plan'?'正在完整拆解剧情事件':'正在提出具体改编方案','<div data-event-message class="notice" role="status">正在读取原稿；不会生成视频或修改原剧本。</div><p class="muted"><span data-event-elapsed>已等待 0 秒</span> · '+esc(limit)+'</p>',btn('取消','cancel'));
    controller=run;pending=true;host.busy(true);
    const started=Date.now(),timer=setInterval(()=>{const el=document.querySelector('[data-event-elapsed]');if(el){const seconds=Math.floor((Date.now()-started)/1000);el.textContent=seconds<60?'已等待 '+seconds+' 秒':'已等待 '+Math.floor(seconds/60)+' 分 '+seconds%60+' 秒';}},1000);
    try{
      const job={task,episode:number,...(requested!=null?{targetSeconds:requested,minSeconds}:{})},result=await SceneAI.request(job,p,run.signal,e=>message(e.message+(e.issues?.length?'；'+e.issues.join('；'):'')));
      if(run.signal.aborted)return;
      if(host.project().id!==p.id||E.sourceKey(host.project(),number)!==key||(task==='event-adaptation'&&E.planKey(E.current(host.project(),number))!==planKey))throw new Error('原稿或事件方案已变化，结果未采用，请重新分析');
      const updated=E.apply(host.project(),job,result.data);
      await host.persist(updated,task==='event-plan'?'重新拆解剧情事件前':'采用改编提案前');
      pending=false;open(number,forBoards);
      if(task==='event-adaptation'){
        message('具体改编方案已生成并保存，请审阅改编后的完整拍摄稿。尚未确认，原稿未修改。');
        const section=document.querySelector('.event-plan-proposal');section?.focus({preventScroll:true});section?.scrollIntoView({block:'start'});
      }
    }catch(e){if(!run.signal.aborted){pending=false;open(number,forBoards);if(requested!=null&&document.querySelector('#event-target')){document.querySelector('#event-target').value=requested;document.querySelector('#event-min').value=minSeconds;reflectChoice();}message(e.message,true);}else if(dialog.open&&document.querySelector('[data-event-elapsed]')){pending=false;open(number,forBoards);message('分析已取消，原稿未修改。可以重新开始。');}}
    finally{clearInterval(timer);if(controller===run)controller=null;pending=false;host.busy(false);}
  }
  async function handle(action,el){
    if(!action.startsWith('event-'))return false;
    if(action==='event-cancel'||action==='event-close'){controller?.abort();host.close();return true;}
    if(pending)return true;
    switch(action){
      case 'event-open':open(Number(el?.dataset.number)||host.episode());break;
      case 'event-analyze':await generate('event-plan');break;
      case 'event-adapt':await generate('event-adaptation');break;
      case 'event-select-adapted':document.querySelector('#event-mode').value='adapted';reflectChoice();message('已选用改编版，请确认所选方案与时长。');break;
      case 'event-extend':case 'event-extend-adapted':{
        const mode=action==='event-extend'?'original':'adapted';
        const range=E.estimate(host.project(),number,mode).recommendedRange;
        if(!range)break;
        document.querySelector('#event-mode').value=mode;
        document.querySelector('#event-min').value=range.min;
        document.querySelector('#event-target').value=range.max;
        reflectChoice();
        message('已选用建议范围 '+seconds(range)+'，请确认。');
        break;
      }
      case 'event-confirm':case 'event-confirm-boards':{
        if(!host.ready())break;
        const updated=C.clone(host.project()),mode=document.querySelector('#event-mode').value,target=Number(document.querySelector('#event-target').value);
        E.confirm(updated,number,mode,target,Number(document.querySelector('#event-min').value));const submit=action==='event-confirm-boards',projectId=updated.id;
        pending=true;host.busy(true);
        try{await host.persist(updated,'确认拍摄版本前');}
        finally{pending=false;host.busy(false);}
        if(!dialog.open||host.project().id!==projectId)break;
        if(submit){host.close();await host.boards(number,true);}else open(number);
        break;
      }
      case 'event-continue':E.requireConfirmed(host.project(),number);host.close();host.boards(number);break;
    }return true;
  }
  // Browsers queue `close`: show() can already have reopened the same dialog
  // for the new request by the time an older close event is dispatched.
  function reflectChoice(){
    const target=Number(document.querySelector('#event-target')?.value),mode=document.querySelector('#event-mode')?.value;
    const p=host.project(),plan=E.current(p,number);
    if(!plan)return;
    const minSeconds=Number(document.querySelector('#event-min')?.value);
    const valid=[minSeconds,target].every(n=>Number.isInteger(n)&&n>=5&&n<=600)&&minSeconds<=target;
    const label=E.rangeLabel(minSeconds,target);
    document.querySelector('[data-event-goal]').textContent=valid?'当前目标 '+label+' 秒':'请输入有效范围：5–600 秒，最短不能超过最长';
    document.querySelector('[data-event-original-gap]').textContent=valid?originalNotice(E.estimate(p,number),target,minSeconds):'请输入有效的规划目标。';
    const block=document.querySelector('[data-event-proposal-gap]');
    if(block)block.textContent=valid?timingMessage(E.estimate(p,number,'adapted'),target,minSeconds):'请输入有效的规划目标';
    const state=E.status(p,number);
    const matches=state.ready&&state.selection.target===target&&(state.selection.minSeconds??target)===minSeconds&&state.selection.mode===mode;
    document.querySelector('[data-event-choice-state]').textContent=matches?'已确认'+(mode==='original'?'完整原稿':'改编版')+' · '+label+' 秒，可继续生成分镜。':'当前选择待确认，请核对拍摄版本和时长。';
    const next=document.querySelector('[data-action="event-continue"]');if(next)next.disabled=!matches;
  }
  dialog.addEventListener('input',event=>{if(['event-min','event-target','event-mode'].includes(event.target.id))reflectChoice();});
  dialog.addEventListener('close',()=>{if(!dialog.open)controller?.abort();});
  dialog.addEventListener('cancel',()=>controller?.abort());
  globalThis.EventPlanUI={configure:value=>{host=value;},open,handle,startBoards,cancel:()=>controller?.abort()};
})();

EventPlanUI=globalThis.EventPlanUI;

// fusion-core.js
(() => {
  'use strict';
  const C=globalThis.SceneCore;
  const hash=value=>{let n=2166136261;for(const c of JSON.stringify(value)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return (n>>>0).toString(16);};
  const sourceKey=(p,number)=>hash(p.scripts.find(e=>e.number===number)?.scenes||[]);
  const characterKey=p=>hash({characters:p.bible.characters,visualStyle:p.visualStyle,aspectRatio:p.aspectRatio});
  const targetDuration=(p,number)=>globalThis.EventPlan?.current(p,number)?.selection?.target||p.bible.outlines.find(o=>o.number===number)?.duration||null;
  function minDuration(p,episode){
    const selected=globalThis.EventPlan?.current(p,episode)?.selection;
    return selected?(selected.minSeconds??selected.target):(p.bible.outlines.find(o=>o.number===episode)?.durationMin??targetDuration(p,episode));
  }
  const targetLabel=(p,episode)=>globalThis.EventPlan.rangeLabel(minDuration(p,episode),targetDuration(p,episode));
  const shotDurations=Object.freeze(Array.from({length:11},(_,i)=>i+5));
  const validDuration=value=>shotDurations.includes(value);
  const validTarget=value=>Number.isInteger(value)&&value>=5&&value<=600;
  function validateTarget(target){
    if(!Number.isInteger(target)||target<1)throw new Error('请先在分集大纲填写本集目标时长');
    if(!validTarget(target))throw new Error('每镜仅支持 5–15 秒整数，本集目标时长须为 5–600 秒整数；请在分集大纲调整，系统不会自动改变目标时长');
    return target;
  }
  // Every independent shot occupies one supported generation duration.
  function shotBudget(target,sceneCount=1,minSeconds=target){
    if(!validTarget(target))return null;
    globalThis.EventPlan?.durationRange(target,minSeconds);
    const maxShots=Math.min(120,Math.floor(target/5)),minShots=Math.max(sceneCount,Math.ceil(minSeconds/15));
    const recommendedMin=Math.min(maxShots,Math.max(minShots,Math.ceil(minSeconds/10),Math.min(3,Math.floor(target/5))));
    return {targetSeconds:target,minSeconds,maxSeconds:target,minShots,maxShots,recommendedMin,recommendedMax:maxShots,allowedDurations:[...shotDurations],preferredSecondsPerShot:'每镜仅限 5–15 秒整数',speechUnitsPerSecond:4};
  }
  // A production planning estimate, not a measurement of recorded speech.
  const speechUnits=text=>(String(text||'').match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{N}]/gu)||[]).length+(String(text||'').match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)||[]).length*2;
  const speechSeconds=text=>Math.ceil(speechUnits(text)/4);
  // Reserve non-speaking time for natural movement; this never requires a frozen frame.
  const spokenCapacity=duration=>Math.max(0,(duration-1)*4);
  function timeline(shots){let end=0;return shots.map(s=>{const start=end;end+=s.duration;return {start,end};});}
  function timing(p,board){
    const target=targetDuration(p,board.episode),total=board.shots.reduce((n,s)=>n+s.duration,0),minimum=minDuration(p,board.episode),delta=target==null?null:total>target?total-target:total<minimum?total-minimum:0;
    const unreviewed=board.shots.filter(s=>s.spokenText==null).length;
    const rushed=board.shots.filter(s=>s.spokenText!=null&&speechUnits(s.spokenText)>spokenCapacity(s.duration)).map(s=>s.number);
    const targetValid=validTarget(target)&&validTarget(minimum)&&minimum<=target,unsupportedDurations=board.shots.filter(s=>!validDuration(s.duration)).map(s=>s.number);
    const aligned=target!=null&&delta===0;
    const label=target==null?'未设目标':delta>0?'超出 '+delta+' 秒':delta<0?'还差 '+(-delta)+' 秒':'总时长符合目标';
    const pacing=targetValid?shotBudget(target,1,minimum):null,tooMany=!!pacing&&board.shots.length>pacing.maxShots;
    return {target,minimum,total,delta,aligned,label:!targetValid?label+' · 目标须为 5–600 秒整数':unsupportedDurations.length?label+' · 单镜须为 5–15 秒整数':tooMany?label+' · 镜头过密':label,targetValid,unsupportedDurations,unreviewed,rushed,pacing,tooMany,averageSeconds:board.shots.length?Math.round(total/board.shots.length*10)/10:0,ready:board.shots.length>0&&targetValid&&aligned&&!unsupportedDurations.length&&!unreviewed&&!rushed.length&&!tooMany};
  }
  const stale=(p,board)=>!!(globalThis.EventPlan?.find(p,board.episode)&&board.eventPlanKey!==globalThis.EventPlan.confirmationKey(p,board.episode))||board.sourceKey!==sourceKey(p,board.episode)||board.characterKey!==characterKey(p)||(board.targetDuration!=null&&board.targetDuration!==targetDuration(p,board.episode));
  function context(p,episode){
    const planned=globalThis.EventPlan?.current(p,episode);
    const e=planned?.selection?globalThis.EventPlan.episode(p,episode):p.scripts.find(e=>e.number===episode);
    if(!e?.scenes.some(s=>s.blocks.some(b=>b.text.trim())))throw new Error('本集还没有剧本正文，请先在剧本模块生成或编写');
    if(!p.confirmedBible||p.revision!==p.confirmedRevision)throw new Error('人物或故事设定尚未确认，请先确认当前修订');
    const target=targetDuration(p,episode),sceneCount=e.scenes.filter(s=>s.blocks.some(b=>b.text.trim())).length;
    validateTarget(target);
    const timingBudget=shotBudget(target,sceneCount,minDuration(p,episode));
    if(sceneCount>timingBudget.maxShots)throw new Error('现有 '+sceneCount+' 个场景超过 '+target+' 秒最多 '+timingBudget.maxShots+' 镜的上限（每镜至少 5 秒），请先合并剧本场景或调整目标时长至至少 '+(sceneCount*5)+' 秒；保留原剧本，不会删掉场景或将多个机位硬塞为一镜');
    if(timingBudget.minSeconds<timingBudget.maxSeconds&&planned?.selection){
      const natural=globalThis.EventPlan.estimate(p,episode,planned.selection.mode);
      timingBudget.naturalEstimate={min:natural.min,max:natural.max};
    }
    return {name:p.name,visualStyle:p.visualStyle,aspectRatio:p.aspectRatio,outline:p.bible.outlines.find(o=>o.number===episode),characters:p.bible.characters,world:p.bible.world,episode:e,timingBudget,...(planned?.selection?{confirmedEvents:globalThis.EventPlan.effective(p,episode,planned.selection.mode).filter(e=>globalThis.EventPlan.visible(e)&&e.text.trim())}:{})};
  }
  // Provide a joint repair brief; never silently shorten or adopt invalid output.
  function repairGuide(p,episode,rows){
    const ctx=context(p,episode),issues=[];
    const {minSeconds,maxSeconds}=ctx.timingBudget;
    let target=maxSeconds;
    const sourceIds=ctx.episode.scenes.filter(s=>s.blocks.some(b=>b.text.trim())).map(s=>s.id),people=new Set(p.bible.characters.map(c=>c.id));
    const guide={targetSeconds:target,timingBudget:ctx.timingBudget,speechUnitsPerSecond:4,requiredSceneIds:sourceIds,issues,shots:[],budget:null};
    if(!Array.isArray(rows)||!rows.length||rows.length>120){issues.push('需要 1–120 个镜头，并覆盖全部原场景');return guide;}
    let lastScene=-1,total=0,durationsValid=true;
    rows.forEach((row,i)=>{
      const s=row&&typeof row==='object'?row:{},label='第 '+(i+1)+' 镜',index=sourceIds.indexOf(s.sceneId);
      if(index<0||index<lastScene)issues.push(label+' 场景引用无效或顺序错误');if(index>=0)lastScene=index;
      if(!Array.isArray(s.characterIds)||s.characterIds.some(id=>!people.has(id)))issues.push(label+' 人物引用无效');
      const durationOK=validDuration(s.duration);
      if(Number.isInteger(s.duration)&&s.duration>0)total+=s.duration;else durationsValid=false;
      if(!durationOK)issues.push(label+' 时长为 '+s.duration+' 秒，仅允许 5–15 秒整数，须同时重排动作、对白与提示词');
      for(const key of ['heading','script','notes','imagePrompt','videoPrompt','spokenText'])if(typeof s[key]!=='string'||s[key].length>(key==='heading'?500:10000)||(key!=='spokenText'&&!s[key].trim()))issues.push(label+' '+key+' 缺失、为空或过长');
      const units=typeof s.spokenText==='string'?speechUnits(s.spokenText):0,speech=Math.ceil(units/4);
      if(durationOK&&speech>s.duration)issues.push(label+' 对白 '+units+' 字当量至少需 '+speech+' 秒，当前只有 '+s.duration+' 秒');
      else if(durationOK&&units>spokenCapacity(s.duration))issues.push(label+' 对白已占满镜头，须至少留1秒非发声余量给表演与自然运动，不能定格补时；本镜最多 '+spokenCapacity(s.duration)+' 字当量');
      guide.shots.push({number:i+1,sceneId:typeof s.sceneId==='string'?s.sceneId:'',duration:durationOK?s.duration:null,spokenUnits:units,minimumSpeechSeconds:speech});
    });
    const missing=sourceIds.filter(id=>!rows.some(s=>s?.sceneId===id));if(missing.length)issues.push('缺少原场景：'+missing.join('、'));
    if(durationsValid&&(total<minSeconds||total>maxSeconds))issues.push('当前合计 '+total+' 秒，目标 '+targetLabel(p,episode)+' 秒，须重新安排整集时长');
    const count=rows.length;
    if(count>ctx.timingBudget.maxShots){issues.push('当前 '+count+' 镜过密，'+target+' 秒最多 '+ctx.timingBudget.maxShots+' 镜；先合并同场重复镜头，重新设计单一动作，再分配秒数，不能只改编号或缩短秒数');guide.mergeRequired=true;return guide;}
    if(minSeconds<maxSeconds){
      const required=guide.shots.reduce((sum,s)=>sum+Math.max(5,s.minimumSpeechSeconds+(s.spokenUnits?1:0)),0);
      target=Math.min(maxSeconds,count*15,Math.max(minSeconds,required,total));
    }
    if(count*5>maxSeconds||count*15<minSeconds){issues.push('镜头数量无法容纳目标时长：每镜仅允许 5–15 秒整数，请合并或拆分镜头后重新分配');guide.splitRequired=count*15<target;return guide;}
    const minimum=guide.shots.map(s=>Math.max(5,s.minimumSpeechSeconds+(s.spokenUnits?1:0)));
    const keepSpeech=minimum.every(n=>n<=15)&&minimum.reduce((n,d)=>n+d,0)<=target;
    const durations=keepSpeech?[...minimum]:rows.map(()=>5),weights=guide.shots.map(s=>s.duration||5);
    if(minSeconds<maxSeconds&&total===target&&guide.shots.every((s,i)=>s.duration>=minimum[i])){
      guide.budget={keepsCurrentSpeech:true,totalSeconds:total,shots:guide.shots.map(s=>({...s,maxSpokenUnits:spokenCapacity(s.duration)}))};return guide;
    }
    for(let left=target-durations.reduce((n,d)=>n+d,0);left>0;left--){let best=-1;for(let i=0;i<count;i++)if(durations[i]<15&&(best<0||weights[i]/(durations[i]+1)>weights[best]/(durations[best]+1)))best=i;if(best<0)break;durations[best]++;}
    guide.budget={keepsCurrentSpeech:keepSpeech,totalSeconds:durations.reduce((n,d)=>n+d,0),shots:guide.shots.map((s,i)=>({number:s.number,duration:durations[i],maxSpokenUnits:spokenCapacity(durations[i]),currentSpokenUnits:s.spokenUnits,needsShorterSpeech:s.spokenUnits>spokenCapacity(durations[i])}))};
    return guide;
  }
  function validate(p,episode,rows){
    const ctx=context(p,episode);
    if(!Array.isArray(rows)||!rows.length||rows.length>120)throw new Error('每集需要 1–120 张分镜卡');
    if(rows.length>ctx.timingBudget.maxShots)throw new Error('当前 '+rows.length+' 镜过密，'+ctx.timingBudget.targetSeconds+' 秒最多 '+ctx.timingBudget.maxShots+' 镜，建议 '+ctx.timingBudget.recommendedMin+'–'+ctx.timingBudget.recommendedMax+' 镜；请合并同场镜头并重新编排动作、对白和时长');
    const text=(v,max=10000,optional=false)=>{if(typeof v!=='string'||v.length>max||(!optional&&!v.trim()))throw new Error('分镜字段为空或过长');return v.trim();};
    const sceneIds=ctx.episode.scenes.filter(s=>s.blocks.some(b=>b.text.trim())).map(s=>s.id),characterIds=new Set(p.bible.characters.map(c=>c.id));
    let lastScene=-1;
    const shots=rows.map(s=>{
      const sceneIndex=sceneIds.indexOf(s.sceneId);if(sceneIndex<0||sceneIndex<lastScene)throw new Error('分镜必须引用本集场景，并保持场景顺序');lastScene=sceneIndex;
      if(!Array.isArray(s.characterIds)||s.characterIds.length>100||s.characterIds.some(id=>!characterIds.has(id)))throw new Error('分镜引用了不存在的人物');
      if(!validDuration(s.duration))throw new Error('镜头「'+s.heading+'」时长为 '+s.duration+' 秒；单镜时长只允许 5–15 秒整数，请重新编排动作、对白和提示词');
      const spokenText=text(s.spokenText,10000,true),speech=speechSeconds(spokenText);
      if(speech>s.duration)throw new Error('镜头「'+s.heading+'」对白按规划语速估算至少需要 '+speech+' 秒，分配只有 '+s.duration+' 秒；请恢复已确认对白或重新分配时长；若需改编先返回确认，不得加速硬塞');
      if(speechUnits(spokenText)>spokenCapacity(s.duration))throw new Error('镜头「'+s.heading+'」对白占满本镜时长，'+s.duration+' 秒最多 '+spokenCapacity(s.duration)+' 字当量，至少留1秒非发声余量给动作反应，画面仍应自然运动；请重排镜头，必要改编须先返回确认');
      return {sceneId:s.sceneId,eventIds:Array.isArray(s.eventIds)?s.eventIds.slice():[],characterIds:[...new Set(s.characterIds)],heading:text(s.heading,500),script:text(s.script,10000),notes:text(s.notes),duration:s.duration,spokenText,imagePrompt:text(s.imagePrompt),videoPrompt:text(s.videoPrompt)};
    });
    if(sceneIds.some(id=>!shots.some(s=>s.sceneId===id)))throw new Error('分镜没有覆盖全部有正文的场景');
    const total=shots.reduce((n,s)=>n+s.duration,0),target=ctx.timingBudget.targetSeconds;
    if(ctx.timingBudget.minSeconds<target&&(total<ctx.timingBudget.minSeconds||total>target))throw new Error('分镜总时长 '+total+' 秒，不在确认的 '+targetLabel(p,episode)+' 秒范围内');
    if(ctx.timingBudget.minSeconds===target&&total!==target)throw new Error('分镜总时长 '+total+' 秒，必须严格等于目标 '+target+' 秒，当前'+(total>target?'超出 '+(total-target):'还差 '+(target-total))+' 秒；请重新编排镜头、对白和动作，不得只修改展示总数');
    if(globalThis.EventPlan?.find(p,episode))globalThis.EventPlan.validateBoards(p,episode,shots);
    return shots;
  }
  function apply(p,job,rows){const next=C.clone(p),shots=validate(p,job.episode,rows);const board={episode:job.episode,eventPlanKey:globalThis.EventPlan?.confirmationKey(p,job.episode)||'',targetDuration:targetDuration(p,job.episode),sourceKey:sourceKey(p,job.episode),characterKey:characterKey(p),visualStyle:p.visualStyle,aspectRatio:p.aspectRatio,generatedAt:new Date().toISOString(),shots:shots.map((s,i)=>({id:C.uid('shot'),number:i+1,...s}))};next.storyboards=next.storyboards.filter(b=>b.episode!==job.episode).concat(board).sort((a,b)=>a.episode-b.episode);return next;}
  function videoKey(p,episode,shotId){return hash({source:sourceKey(p,episode),characters:characterKey(p),target:targetDuration(p,episode),board:p.storyboards.find(b=>b.episode===episode),shotId});}
  function videoContext(p,job){
    const ctx=context(p,job.episode),board=p.storyboards.find(b=>b.episode===job.episode),index=board?.shots.findIndex(s=>s.id===job.shotId)??-1;
    if(index<0)throw new Error('所选镜头已不存在，请重新选择');
    if(stale(p,board))throw new Error('人物、正文或视觉设定已变化，请先更新本集分镜');
    if(!timing(p,board).ready)throw new Error('请先按目标时长重排分镜，核对镜头数量、时长和实际对白，再展开视频方案');
    if(job.shotKey!==videoKey(p,job.episode,job.shotId))throw new Error('镜头内容已变化，请基于最新内容重新生成视频方案');
    const shot=board.shots[index],neighbor=s=>s?{heading:s.heading,duration:s.duration,notes:s.notes,imagePrompt:s.imagePrompt,spokenText:s.spokenText}:null;
    return {...ctx,shot,timeRange:timeline(board.shots)[index],previousShot:neighbor(board.shots[index-1]),nextShot:neighbor(board.shots[index+1])};
  }
  const videoSections={videoPrompt:'视频提示词',startFrame:'首帧状态',motion:'主体动作与运镜',endFrame:'尾帧状态',lighting:'环境、光线与质感',sound:'声音与配音',negativePrompt:'负面约束',continuity:'剪辑衔接与一致性'};
  function includesSpeech(copy,spoken){
    const normalize=s=>s.normalize('NFKC').replace(/[\p{P}\p{Z}\s]/gu,'');
    const full=normalize(copy);let cursor=0;
    for(const line of spoken.split(/(?<=[。！？!?；;])|\r?\n/).map(normalize).filter(Boolean)){const found=full.indexOf(line,cursor);if(found<0)return false;cursor=found+line.length;}
    return true;
  }
  function videoPlanText(value){return '本镜 '+value.duration+' 秒 · 一个连续镜头\n实际对白 / 旁白：'+(value.spokenText||'无')+'\n\n'+Object.entries(videoSections).map(([key,label])=>'【'+label+'】\n'+value[key]).join('\n\n');}
  function validateVideo(p,job,value){
    const {shot}=videoContext(p,job);
    if(!value||value.shotId!==shot.id||value.duration!==shot.duration||value.spokenText!==shot.spokenText)throw new Error('详细视频方案必须保持原镜头编号、秒数和实际对白不变');
    const data={shotId:shot.id,duration:shot.duration,spokenText:shot.spokenText};
    for(const key of Object.keys(videoSections)){
      if(typeof value[key]!=='string'||!value[key].trim()||value[key].length>3000)throw new Error('详细视频方案缺少 '+videoSections[key]+'，或内容过长');
      data[key]=value[key].trim();
    }
    if(shot.spokenText&&(!includesSpeech(data.sound,shot.spokenText)||!includesSpeech(data.videoPrompt,shot.spokenText)))throw new Error('声音与视频提示词必须按顺序完整保留本镜实际对白各句文字，不能另写台词；可以添加说话人说明和引号');
    if(videoPlanText(data).length>10000)throw new Error('详细视频方案总长不能超过10000字');
    return data;
  }
  function preview(rows){const times=timeline(rows);return '分镜计划合计 '+rows.reduce((n,s)=>n+s.duration,0)+' 秒\n对白时长按每秒约 4 个中文字符估算，成片仍需配音与剪辑复核。\n\n'+rows.map((s,i)=>`镜头 ${i+1} · ${s.heading} · ${times[i].start}–${times[i].end} 秒（${s.duration} 秒）\n原文参考：${s.script}\n\n实际对白 / 旁白：${s.spokenText||'无'}\n\n镜头计划：${s.notes}\n\n画面提示词：${s.imagePrompt}\n\n视频提示词：${s.videoPrompt}`).join('\n\n────────\n\n');}
  function csv(p){const rows=[['集数','镜号','原场景','人物','镜头标题','时长秒','对应正文','镜头计划','画面提示词','视频提示词','资料状态','起始秒','结束秒','实际对白旁白','对白估算秒','本集总秒数','本集目标秒数','时长检查']];for(const b of p.storyboards){const t=timing(p,b),times=timeline(b.shots);for(const [i,s] of b.shots.entries()){const source=p.scripts.find(e=>e.number===b.episode)?.scenes.find(x=>x.id===s.sceneId);rows.push([b.episode,s.number,source?.heading||'原场景已删除',s.characterIds.map(id=>p.bible.characters.find(c=>c.id===id)?.name||'人物已移除').join('、'),s.heading,s.duration,s.script,s.notes,s.imagePrompt,s.videoPrompt,stale(p,b)?'源资料已变化，需复核':'与源资料一致',times[i].start,times[i].end,s.spokenText??'旧版未核对',s.spokenText==null?'未核对':speechSeconds(s.spokenText),t.total,t.target==null?'未设目标':targetLabel(p,b.episode),t.label+(t.unreviewed?'；旧版对白未核对':'')+(t.rushed.length?'；第 '+t.rushed.join('、')+' 镜对白过长':'')+'；实际配音剪辑需复核']);}}return '\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');}
  globalThis.Fusion={targetLabel,minDuration,shotDurations,validDuration,validTarget,validateTarget,sourceKey,characterKey,stale,targetDuration,shotBudget,speechUnits,speechSeconds,spokenCapacity,timeline,timing,context,repairGuide,validate,apply,preview,csv,videoKey,videoContext,validateVideo,videoPlanText};
})();

Fusion=globalThis.Fusion;

// production-fields.js
/* Shared production preparation contract. Original scripts/shots remain untouched. */
(() => {
  const limits={purpose:1000,start_state:2000,observable_action:2000,end_state:2000,next_connection:2000,negative_prompt:2000,sound:1000,post_overlay:2000};
  const labels={purpose:'镜头作用',start_state:'开始状态',observable_action:'主要动作',end_state:'结束状态',next_connection:'下一镜连接',negative_prompt:'禁止变化',sound:'声音',post_overlay:'后期叠加'};
  const headings={'镜头作用':'purpose','首帧状态':'start_state','首帧':'start_state','主体动作与运镜':'observable_action','动作与运镜':'observable_action','尾帧状态':'end_state','尾帧':'end_state','声音与配音':'sound','声音':'sound','负面约束':'negative_prompt','禁止变化':'negative_prompt','剪辑衔接与一致性':'next_connection','下一镜连接':'next_connection','后期叠加':'post_overlay'};
  function extract(text=''){
    const result={};
    for(const match of text.matchAll(/【([^】\n]+)】\s*([\s\S]*?)(?=【[^】\n]+】|$)/g))if(headings[match[1]])result[headings[match[1]]]=match[2].trim();
    return result;
  }
  function missing(fields,last){return ['purpose','start_state','observable_action','end_state','negative_prompt',...(!last?['next_connection']:[])].filter(key=>!fields[key]?.trim());}
  function board(p,episode){const value=p.storyboards.find(b=>b.episode===episode);if(!value?.shots.length)throw new Error('本集尚无分镜');return value;}
  function targets(p,episode,ids){
    const b=board(p,episode);
    if(!Array.isArray(ids)||!ids.length||ids.length>5||new Set(ids).size!==ids.length||ids.some(id=>!b.shots.some(s=>s.id===id)))throw new Error('每批只能整理 1–5 个有效镜头');
    return ids.map(id=>b.shots.find(s=>s.id===id));
  }
  function validate(p,episode,rows,ids){
    const b=board(p,episode);
    if(!Array.isArray(rows)||!rows.length||rows.length>b.shots.length||new Set(rows.map(r=>r?.shotId)).size!==rows.length)throw new Error('制作字段数量或镜头编号不正确');
    if(ids&&(rows.length!==ids.length||rows.some((r,i)=>r?.shotId!==ids[i])))throw new Error('制作字段必须保持镜头编号、数量与顺序');
    return rows.map(row=>{
      const shot=b.shots.find(s=>s.id===row?.shotId);
      if(!shot)throw new Error('制作整理不能改变镜头编号');
      if(row.duration!==shot.duration)throw new Error('镜头 '+shot.id+' 的时长必须保持 '+shot.duration+' 秒');
      if(row.spokenText!==shot.spokenText)throw new Error('镜头 '+shot.id+' 的实际对白必须逐字保持 '+JSON.stringify(shot.spokenText)+'，不能恢复溯源原文的旧台词');
      const result={shotId:shot.id,duration:shot.duration,spokenText:shot.spokenText},existing=extract(shot.videoPrompt);
      for(const [key,max]of Object.entries(limits)){
        const value=row[key];
        if(typeof value!=='string'||[...value].length>max||(key!=='post_overlay'&&!value.trim()))throw new Error(labels[key]+'必须填写具体内容且不超过 '+max+' 字');
        if(existing[key]&&value!==existing[key])throw new Error('已有的'+labels[key]+'必须逐字保留，只补缺失字段');
        result[key]=value;
      }
      if(shot.spokenText&&!existing.sound){
        const norm=s=>s.normalize('NFKC').replace(/[\p{P}\p{Z}\s]/gu,'');let cursor=0;const sound=norm(result.sound);
        for(const line of shot.spokenText.split(/(?<=[。！？!?；;])|\r?\n/).map(norm).filter(Boolean)){const pos=sound.indexOf(line,cursor);if(pos<0)throw new Error('声音字段必须按原顺序完整保留本镜实际对白');cursor=pos+line.length;}
      }
      return result;
    });
  }
  function context(p,episode,ids){
    globalThis.EventPlan?.requireConfirmed(p,episode);
    const b=board(p,episode),shots=targets(p,episode,ids);
    if(Fusion.stale(p,b)||!Fusion.timing(p,b).ready)throw new Error('请先解决分镜源资料、时长或对白问题，再整理制作字段');
    return {name:p.name,bible:p.confirmedBible||p.bible,episode:globalThis.EventPlan?globalThis.EventPlan.episode(p,episode):p.scripts.find(e=>e.number===episode),visualStyle:p.visualStyle,aspectRatio:p.aspectRatio,shots:shots.map(s=>{const i=b.shots.indexOf(s);return {...s,existingFields:extract(s.videoPrompt),previousShot:b.shots[i-1]||null,nextShot:b.shots[i+1]||null};})};
  }
  globalThis.ProductionFields={limits,labels,extract,missing,targets,validate,context};
})();

ProductionFields=globalThis.ProductionFields;

// ai-workflow.js
/* Shared result validation and application: the server and browser use the same contract. */
(() => {
  const C = globalThis.SceneCore;
  const sectionKeys = {core:['logline','story','genre','tone','theme'], world:['era','locations','rules','facts'], structure:['mainline','opening','development','climax','ending']};
  function text(value, max=50000, nonempty=true) {
    if (typeof value !== 'string' || value.length > max || (nonempty && !value.trim())) throw new Error('模型返回的文字为空或超出长度限制');
    return value;
  }
  function list(value, max, nonempty=true) {
    if (!Array.isArray(value) || value.length > max || (nonempty && !value.length)) throw new Error('模型返回的列表为空或数量不正确');
    return value;
  }
  function section(value, key, p, job) {
    if (sectionKeys[key]) return Object.fromEntries(sectionKeys[key].map(k => [k,text(value?.[k])]));
    if (key === 'characters') {const names=new Set();return list(value,100).map(c=>{if(!Number.isInteger(c.age)||c.age<0||c.age>9999)throw new Error('人物年龄须为 0–9999 的整数');const name=text(c.name,100).trim();if(names.has(name))throw new Error('人物姓名重复');names.add(name);const old=p.bible.characters.find(x=>x.name===name);return {id:old?.id||C.uid('character'),...Object.fromEntries(['name','role','goal','motivation','flaw','arc','relationships'].map(k=>[k,text(c[k],k==='name'?100:50000,k!=='relationships')])),age:c.age,traits:list(c.traits,30).map(t=>text(t,100)),background:text(c.background)};});}
    if (key === 'outlines') {
      const count = job.task === 'bible' ? job.episodeCount : p.bible.outlines.length;
      if (list(value,300).length !== count) throw new Error('模型返回的分集数量与设定不一致');
      return value.map((o,i) => {
        if (o.number !== i+1) throw new Error('模型返回的集号或时长无效');
        const duration = job.task === 'bible' ? job.duration : p.bible.outlines[i].duration;
        if (duration!==null && (!Number.isInteger(duration)||duration<1||duration>86400||o.duration!==duration)) throw new Error('第 '+(i+1)+' 集目标时长必须为 '+duration+' 秒，模型返回了 '+o.duration+' 秒；请将本集 duration 改回 '+duration+' 并匹配内容长度');
        const durationMin=job.task==='section'?p.bible.outlines[i].durationMin:(job.minSeconds??(duration>=5&&duration<=600?5:undefined));
        return {number:o.number,duration,...(durationMin!=null?{durationMin}:{}),...Object.fromEntries(['title','goal','conflict','turn','hook'].map(k=>[k,text(o[k],k==='title'?200:50000)]))};
      });
    }
    throw new Error('创作圣经分区无效');
  }
  function scenes(value, generate=false) {
    const data = list(value,generate?30:100).map(s=>({id:generate?C.uid('scene'):s.id,heading:text(s.heading,500),blocks:list(s.blocks,300).map(b=>({type:b.type,text:text(b.text),speaker:typeof b.speaker==='string'?b.speaker:'',parenthetical:typeof b.parenthetical==='string'?b.parenthetical:''}))}));
    return C.cleanScenes(data);
  }
  function validate(job, value, p) {
    if(globalThis.ReelMentor?.tasks.includes(job.task))return globalThis.ReelMentor.validate(job.task,value,globalThis.ReelMentor.source(p,job.episode));
    if(job.task==='event-plan')return globalThis.EventPlan.validateAnalysis(p,job.episode,value);
    if(job.task==='event-adaptation')return globalThis.EventPlan.validateProposal(p,job.episode,value,globalThis.EventPlan.planningTarget(p,job.episode,job.targetSeconds),job.minSeconds);
    if(job.task==='handoff-plan'){ProductionFields.targets(p,job.episode,job.shotIds);return ProductionFields.validate(p,job.episode,value,job.shotIds);}
    if (job.task === 'directions') {
      if(!Number.isInteger(job.episodeCount)||job.episodeCount<1||job.episodeCount>20||(job.duration!==null&&(!Number.isInteger(job.duration)||job.duration<1||job.duration>86400)))throw new Error('故事方向的集数或时长无效');
      return C.cleanDirectionOptions(value);
    }
    if (job.task === 'section') return section(value,job.section,p,job);
    if (job.task === 'bible') {
      const b = Object.fromEntries(['core','world','characters','structure','outlines'].map(k=>[k,section(value?.[k],k,p,job)]));
      return C.cleanBible(b);
    }
    if (job.task === 'boards') {const result=Fusion.validate(p,job.episode,value);if(job.forPlatform&&(result.length<1||result.some(s=>!Fusion.validDuration(s.duration))))throw new Error('视频制作交付至少 1 镜，每镜时长仅限 5–15 秒整数；请在原目标总秒数内重新分配，不延长目标');return result;}
    if (job.task === 'video-plan') return Fusion.validateVideo(p,job,value);
    if (job.task === 'script') {const result=scenes(value,true),target=p.confirmedBible?.outlines.find(o=>o.number===job.episode)?.duration,spoken=result.flatMap(s=>s.blocks.filter(b=>b.type==='dialogue').map(b=>b.text)).join('\n'),estimated=Fusion.speechSeconds(spoken);if(target&&estimated>target)throw new Error('剧本对白按规划语速估算至少需要 '+estimated+' 秒，超过本集目标 '+target+' 秒，请压缩对白并给动作留出时间');const budget=Fusion.shotBudget(target);if(budget&&result.length>budget.maxShots)throw new Error('本集 '+target+' 秒最多安排 '+budget.maxShots+' 个独立场景；请合并地点与重复动作，为后续分镜留出演绎时间');return result;}
    if (job.task === 'novel' || (job.task === 'coauthor' && ['讨论','总结'].includes(job.mode))) return text(value,50000);
    if (job.task === 'parse') {
      const result=list(value,100,false).map(v=>{
        if (!['角色','场景','道具'].includes(v.type)) throw new Error('模型返回的主体类型无效');
        return {type:v.type,name:text(v.name,200),description:text(v.description,10000)};
      });
      return result.filter((v,i,a)=>a.findIndex(x=>x.type===v.type&&x.name===v.name)===i);
    }
    if (job.task === 'production') {
      const film=p.productions.find(f=>f.id===job.productionId),targets=film?.shots.filter(s=>job.shotIds.includes(s.id));
      if (!targets?.length || list(value,20).length!==targets.length) throw new Error('分镜计划数量不正确');
      return value.map((s,i)=>{
        if(s.id!==targets[i].id) throw new Error('分镜计划与原场景编号不匹配');
        return {id:s.id,notes:text(s.notes,10000)};
      });
    }
    if (job.task === 'coauthor') {
      if(list(value,300).length!==job.scripts.length) throw new Error('共创改变了分集数量');
      return value.map((e,i)=>{
        const source=job.scripts[i];
        if(e.number!==source.number || list(e.scenes,100).length!==source.scenes.length) throw new Error('共创改变了分集或场景数量');
        const result=scenes(e.scenes);
        result.forEach((s,j)=>{
          const old=source.scenes[j];
          if(s.id!==old.id || s.heading!==old.heading) throw new Error('共创改变了场景编号或标题');
          if(job.scope==='paragraphs' && s.blocks.length!==old.blocks.length) throw new Error('选中段落模式需要保持段落数量；续写请使用当前场景');
          if(job.mode==='续写' && (s.blocks.length<=old.blocks.length || old.blocks.some((b,k)=>JSON.stringify(b)!==JSON.stringify(s.blocks[k])))) throw new Error('续写必须保留原文并在后面追加，请重试');
        });
        return {number:e.number,scenes:result};
      });
    }
    throw new Error('不支持的生成任务');
  }
  function syncEpisodes(p) {
    for (const o of p.bible.outlines) {
      const e=p.scripts.find(e=>e.number===o.number);
      if(e) e.title=o.title;
      else p.scripts.push({number:o.number,title:o.title,basedOnRevision:0,scenes:[]});
    }
    p.scripts.sort((a,b)=>a.number-b.number);
  }
  function hasScriptContent(episode) {
    return !!episode?.scenes?.some(s=>s.blocks.some(b=>typeof b.text==='string'&&b.text.trim()));
  }
  function scriptReadiness(p,number) {
    const outline=p.bible.outlines.find(o=>o.number===number);
    if(!outline)return {ready:false,reason:'missing-outline',message:'本集还没有分集大纲，先补充大纲再生成正文。'};
    if(['goal','conflict','turn','hook'].some(k=>!outline[k]?.trim()))return {ready:false,reason:'incomplete-outline',message:'本集大纲尚未填写完整，请补齐目标、冲突、转折和结尾钩子。'};
    if(!p.confirmedBible||p.confirmedRevision!==p.revision)return {ready:false,reason:'unconfirmed',message:'当前创作圣经尚未确认，确认后即可生成正文。'};
    if(!p.confirmedBible.outlines.some(o=>o.number===number))return {ready:false,reason:'unconfirmed',message:'本集大纲尚未确认，请先确认当前设定。'};
    return {ready:true,reason:'ready',message:'已确认的创作圣经已就绪，点击下方按钮生成本集正文。'};
  }
  function ensureOutline(p,number) {
    if(!Number.isInteger(number)||number<1||number>300)throw new Error('分集编号无效');
    if(p.bible.outlines.some(o=>o.number===number))return false;
    C.markBibleEdit(p);
    for(let next=p.bible.outlines.length+1;next<=number;next++)p.bible.outlines.push({number:next,title:p.scripts.find(e=>e.number===next)?.title||'第 '+next+' 集',duration:p.bible.outlines.length?p.bible.outlines.at(-1).duration:null,goal:'',conflict:'',turn:'',hook:''});
    syncEpisodes(p);return true;
  }
  function selectedDirection(p,job) {
    const set=p.storyDirections;
    if(!set||set.id!==job.directionSetId)throw new Error('故事方向已变化，请返回方案页重新选择');
    const direction=set.candidates.find(c=>c.id===job.directionId);
    if(!direction)throw new Error('所选故事方向不存在');
    if(job.episodeCount!==set.episodeCount||job.duration!==set.duration||job.minSeconds!==set.minSeconds)throw new Error('请保持所选方案的集数和时长，或重新生成三个方向');
    return direction;
  }
  function apply(p,job,value) {
    const candidate=C.clone(p),data=validate(job,value,p);
    if(job.task==='directions') {
      if(candidate.storyDirections)C.snapshot(candidate,'更换故事方向前','保留上一组三个方向及当前设定');
      candidate.storyDirections={id:C.uid('directions'),createdAt:new Date().toISOString(),instruction:job.instruction||p.bible.core.logline,episodeCount:job.episodeCount,duration:job.duration,...(job.minSeconds!=null?{minSeconds:job.minSeconds}:{}),selectedId:'',candidates:data};
      return C.cleanProject(candidate);
    }
    if(['event-plan','event-adaptation'].includes(job.task))return C.cleanProject(globalThis.EventPlan.apply(candidate,job,data));
    if(job.task==='boards') return C.cleanProject(Fusion.apply(candidate,job,data));
    if(job.task==='video-plan') {
      candidate.storyboards.find(b=>b.episode===job.episode).shots.find(s=>s.id===job.shotId).videoPrompt=Fusion.videoPlanText(data);
      return C.cleanProject(candidate);
    }
    if(job.task==='section'||job.task==='bible') {
      if(job.task==='bible'&&(job.directionId||job.directionSetId)){selectedDirection(p,job);candidate.storyDirections.selectedId=job.directionId;}
      C.markBibleEdit(candidate);
      if(job.task==='bible') candidate.bible=data; else candidate.bible[job.section]=data;
      syncEpisodes(candidate);
    } else if(job.task==='script') {
      if(!p.confirmedBible || p.revision!==p.confirmedRevision) throw new Error('请先确认当前创作圣经');
      const outline=p.confirmedBible.outlines.find(o=>o.number===job.episode);
      if(!outline) throw new Error('本集没有已确认大纲');
      let e=candidate.scripts.find(e=>e.number===job.episode);
      if(!e) {e={number:job.episode,title:outline.title,basedOnRevision:0,scenes:[]};candidate.scripts.push(e);}
      e.scenes=data;e.title=outline.title;e.basedOnRevision=p.confirmedRevision;
    } else if(job.task==='parse') {
      for(const e of data) if(!candidate.entities.some(old=>old.type===e.type&&old.name===e.name)) candidate.entities.push({id:C.uid('entity'),...e,status:'待确认'});
    } else if(job.task==='production') {
      const f=candidate.productions.find(f=>f.id===job.productionId);
      for(const s of data) f.shots.find(old=>old.id===s.id).notes=s.notes;
    } else if(job.task==='novel') candidate.novels.unshift({id:C.uid('novel'),name:p.name+' · 小说稿',style:job.style,content:data,createdAt:new Date().toISOString()});
    else throw new Error('此任务不能直接替换项目');
    return C.cleanProject(candidate);
  }
  function preview(job,value) {
    if(job.task==='boards')return Fusion.preview(value);
    if(job.task==='video-plan')return Fusion.videoPlanText(value);
    if(typeof value==='string') return value;
    if(job.task==='script') return value.map(s=>s.heading+'\n\n'+s.blocks.map(C.blockText).join('\n\n')).join('\n\n');
    if(job.task==='parse') return value.map(v=>v.type+' · '+v.name+'\n'+v.description).join('\n\n');
    if(job.task==='production') return value.map(v=>v.notes).join('\n\n────────\n\n');
    const labels={age:'年龄',traits:'性格',background:'人物小传',core:'故事核心',world:'世界与规则',characters:'人物与关系',structure:'总体结构',outlines:'分集大纲',logline:'一句话梗概',story:'核心故事',genre:'题材',tone:'基调',theme:'主题',era:'时代',locations:'地点',rules:'世界规则',facts:'不可违反事实',name:'姓名',role:'角色定位',goal:'目标',motivation:'动机',flaw:'缺陷',arc:'人物弧',relationships:'关系',mainline:'主线',opening:'开端',development:'发展',climax:'高潮',ending:'结局',number:'集号',title:'标题',duration:'时长（秒）',conflict:'冲突',turn:'转折',hook:'结尾钩子'};
    function format(v){if(Array.isArray(v))return v.map(format).join('\n\n');if(v&&typeof v==='object')return Object.entries(v).filter(([k])=>k!=='id').map(([k,x])=>(labels[k]||k)+'：'+(typeof x==='object'?'\n':'')+format(x)).join('\n');return String(v);}
    return format(value);
  }
  globalThis.SceneAI={validate,apply,syncEpisodes,preview,hasScriptContent,scriptReadiness,ensureOutline,selectedDirection};
})();

SceneAI=globalThis.SceneAI;

// ai-client.js
(() => {
  const failure=result=>Object.assign(new Error(result.error||'生成失败'),{code:result.code,repair:result.repair});
  async function request(job,project,signal,onProgress=()=>{}) {
    const r=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/x-ndjson'},body:JSON.stringify({...job,project:{...project,snapshots:[],analysisReports:[]}}),signal});
    if(r.ok&&r.headers.get('Content-Type')?.includes('application/x-ndjson')){
      const reader=r.body.getReader(),decoder=new TextDecoder();let buffer='',result;
      function receive(line){if(!line.trim())return;let event;try{event=JSON.parse(line);}catch{throw new Error('本地服务进度响应异常，请重试。');}if(event.type==='progress'){try{onProgress(event.data);}catch{}}else if(event.type==='result')result=event.data;else if(event.type==='error')throw failure(event.data);}
      try{
        while(true){const {value,done}=await reader.read();buffer+=done?decoder.decode():decoder.decode(value,{stream:true});if(buffer.length>2*1024*1024)throw new Error('生成响应过长，请缩小生成范围');let newline;while((newline=buffer.indexOf('\n'))>=0){receive(buffer.slice(0,newline));buffer=buffer.slice(newline+1);}if(done)break;}
        if(buffer.trim())receive(buffer);if(!result)throw new Error('生成连接中断，尚未收到完整结果，请重试');return result;
      }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
    }
    let result;try{result=await r.json();}catch{throw new Error('本地服务响应异常，请检查服务是否运行。');}
    if(!r.ok)throw failure(result);
    return result;
  }
  globalThis.SceneAI.request=request;
})();

SceneAI=globalThis.SceneAI;

// batch.js
(() => {
  'use strict';
  const C=SceneCore,A=SceneAI,F=Fusion;
  const hash=value=>{let n=2166136261;for(const c of JSON.stringify(value)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return (n>>>0).toString(16);};
  const outputKey=(p,kind,number)=>kind==='scripts'?F.sourceKey(p,number):hash(p.storyboards.find(b=>b.episode===number)?.shots||[]);
  const referenceKey=(p,kind)=>hash({bible:p.confirmedBible,revision:p.confirmedRevision,...(kind==='boards'?{style:p.visualStyle,ratio:p.aspectRatio,sources:p.bible.outlines.map(o=>[o.number,F.sourceKey(p,o.number),globalThis.EventPlan?.confirmationKey(p,o.number)])}:{})});
  function plan(p,kind,mode='missing'){
    if(!['scripts','boards'].includes(kind)||!['missing','all'].includes(mode))throw new Error('批量生成类型无效');
    const outlines=p.bible.outlines;
    if(!outlines.length)throw new Error('请先建立分集大纲');
    const incomplete=outlines.filter(o=>['goal','conflict','turn','hook'].some(k=>!o[k]?.trim()));
    if(incomplete.length)throw new Error('第 '+incomplete.map(o=>o.number).join('、')+' 集大纲尚未完整，请补齐目标、冲突、转折和结尾钩子');
    if(kind==='boards'){
      const missing=outlines.filter(o=>!A.hasScriptContent(p.scripts.find(e=>e.number===o.number)));
      if(missing.length)throw new Error('第 '+missing.map(o=>o.number).join('、')+' 集还没有剧本正文，请先一键生成全部剧本');
      const confirmed=C.clone(p);if(!confirmed.confirmedBible||confirmed.revision!==confirmed.confirmedRevision)C.confirmBible(confirmed);
      for(const o of outlines){globalThis.EventPlan?.requireConfirmed(p,o.number);F.context(confirmed,o.number);}
    }
    return outlines.map(o=>{
      const script=p.scripts.find(e=>e.number===o.number),board=p.storyboards.find(b=>b.episode===o.number);
      const exists=kind==='scripts'?A.hasScriptContent(script):!!board;
      const ready=kind==='scripts'?exists:exists&&!F.stale(p,board)&&F.timing(p,board).ready;
      const skip=mode==='missing'&&ready;
      return {number:o.number,title:o.title,duration:kind==='boards'?F.targetDuration(p,o.number):o.duration,status:skip?'skipped':'pending',reason:skip?'保留已有内容':exists?(kind==='boards'&&!ready?'更新需复核的分镜':'重新生成'):'补齐缺失',error:'',resultKey:skip?outputKey(p,kind,o.number):''};
    });
  }
  const counts=run=>({total:run.entries.length,done:run.entries.filter(e=>e.status==='done').length,skipped:run.entries.filter(e=>e.status==='skipped').length,remaining:run.entries.filter(e=>!['done','skipped'].includes(e.status)).length});
  function create(p,kind,mode='missing',instruction=''){
    if(!p.confirmedBible||p.revision!==p.confirmedRevision)throw new Error('请先确认当前故事设定');
    const now=new Date().toISOString();
    return {id:C.uid('batch'),kind,mode,instruction,referenceKey:referenceKey(p,kind),snapshotId:'',status:'stopped',createdAt:now,updatedAt:now,entries:plan(p,kind,mode)};
  }
  function checkResume(p,run){
    if(!run||!counts(run).remaining)throw new Error('没有待继续生成的集数');
    if(p.revision!==p.confirmedRevision||referenceKey(p,run.kind)!==run.referenceKey)throw new Error('故事设定或源剧本已变化，请重新开启一键任务；已有内容会保留');
    for(const e of run.entries.filter(e=>['done','skipped'].includes(e.status)))if(outputKey(p,run.kind,e.number)!==e.resultKey)throw new Error('第 '+e.number+' 集内容在任务后已修改，请重新开启任务并选择补齐缺失，避免覆盖编辑');
  }
  async function execute(initial,initialRun,{request,checkpoint,onProgress=()=>{},signal}){
    let p=C.clone(initial),run=C.clone(initialRun);
    checkResume(p,run);
    for(const e of run.entries)if(!['done','skipped'].includes(e.status)){e.status='pending';e.error='';}
    if(!run.snapshotId){const snap=C.snapshot(p,'一键生成全部'+(run.kind==='scripts'?'剧本':'AI 分镜')+'前','整批任务的原始内容备份');run.snapshotId=snap.id;}
    const notify=()=>onProgress(C.clone(run));
    async function persist(){
      run.updatedAt=new Date().toISOString();p.batchRun=C.clone(run);
      try{const saved=await checkpoint(C.clone(p));if(saved)p=C.clone(saved);}
      catch(error){error.batchCheckpointFailure=true;throw error;}
      notify();
    }
    run.status='running';await persist();
    for(const entry of run.entries){
      if(['done','skipped'].includes(entry.status))continue;
      if(signal?.aborted){run.status='stopped';await persist();return {project:p,run};}
      entry.status='running';await persist();
      const job={task:run.kind==='scripts'?'script':'boards',episode:entry.number,instruction:run.instruction};
      let result;
      try{
        if(signal?.aborted)throw new DOMException('生成已停止','AbortError');
        result=await request(job,p,signal);
        if(signal?.aborted)throw new DOMException('生成已停止','AbortError');
        p=A.apply(p,job,result.data);
        entry.status='done';entry.error='';entry.resultKey=outputKey(p,run.kind,entry.number);
      }catch(error){
        const cancelled=signal?.aborted||error.name==='AbortError'||error.code==='CANCELLED';
        entry.status=cancelled?'pending':'failed';entry.error=cancelled?'':String(error.message||'生成失败').slice(0,2000);
        run.status=cancelled?'stopped':'failed';await persist();return {project:p,run};
      }
      // Each successful episode is committed before the following request begins.
      await persist();
    }
    run.status='completed';await persist();return {project:p,run};
  }
  globalThis.SceneBatch={plan,counts,create,checkResume,execute,referenceKey,outputKey};
})();

SceneBatch=globalThis.SceneBatch;

// screenplay.js
/* Continuous screenplay editor. Live and historical views use the same script data. */
(() => {
  'use strict';
  const C=SceneCore, esc=C.esc;
  const types=[['action','动作'],['character','角色'],['parenthetical','括注'],['dialogue','对白'],['transition','转场'],['comment','评论'],['subtitle','字幕']];
  const ui={sceneId:'',paragraph:null,layout:'asian',focus:false,directory:false,task:'讨论',scope:'scene',instruction:'',reply:'',pending:null,working:false,scroll:0,drag:null,entities:null,paragraphs:[]};
  let host,ignoreFocus=false,coauthorController=null;
  const attrs=(i,j,k)=>`data-episode-index="${i}" data-scene-index="${j}"${k===undefined?'':` data-block-index="${k}"`}`;
  const action=(label,name,extra='',cls='')=>`<button type="button" class="${cls}" data-action="sc-${name}" ${extra}>${label}</button>`;
  function selected(){const p=host.project();for(const [i,e]of p.scripts.entries()){const j=e.scenes.findIndex(s=>s.id===ui.sceneId);if(j>=0)return {e,s:e.scenes[j],i,j};}const i=p.scripts.findIndex(e=>e.scenes.length);if(i<0)return null;const e=p.scripts[i];ui.sceneId=e.scenes[0].id;return {e,s:e.scenes[0],i,j:0};}
  function field(text,path,label,className=''){return `<span class="script-edit ${className}" contenteditable="plaintext-only" role="textbox" aria-label="${esc(label)}" aria-multiline="true" data-script-path="${path}" spellcheck="false">${esc(text)}</span>`;}
  function blockMarkup(b,i,j,k){const path=`scripts.${i}.scenes.${j}.blocks.${k}`,label=`第 ${host.project().scripts[i].number} 集 场景 ${j+1} 段落 ${k+1}`;return `<div class="screenplay-row type-${b.type}" ${attrs(i,j,k)} draggable="false"><div class="paragraph-tools"><button class="drag-block" draggable="true" title="拖动段落；点击打开段落菜单" aria-label="移动段落 ${label}" data-action="sc-block-menu" ${attrs(i,j,k)}>⠿</button><select aria-label="${label} 段落类型" data-block-type ${attrs(i,j,k)}>${types.map(([value,name])=>`<option value="${value}" ${value===b.type?'selected':''}>${b.type==='dialogue'&&value==='dialogue'&&b.speaker?'角色 / 对白':name}</option>`).join('')}</select></div>${b.type==='dialogue'?`<div class="screenplay-dialogue">${field(b.speaker,path+'.speaker',label+' 说话人','speaker')}${field(b.parenthetical,path+'.parenthetical',label+' 括注','parenthetical')}<span class="dialogue-colon" aria-hidden="true">：</span>${field(b.text,path+'.text',label+' 对白','dialogue-text')}</div>`:field(b.text,path+'.text',label+' '+(types.find(t=>t[0]===b.type)?.[1]||'正文'))}</div>`;}
  function emptyEpisode(p,e){
    const ready=SceneAI.scriptReadiness(p,e.number),needsOutline=['missing-outline','incomplete-outline'].includes(ready.reason);
    const label=ready.ready?'生成第 '+e.number+' 集正文':needsOutline?'补充第 '+e.number+' 集大纲':'确认设定并生成本集';
    return `<div class="script-empty-state"><strong>第 ${e.number} 集尚未生成正文</strong><p>${esc(ready.message)}</p><button class="button primary" data-action="prepare-episode" data-number="${e.number}">${label}</button>${ready.ready?'<small>使用已确认的设定与本集大纲，生成后可预览并写入正文。</small>':''}</div>`;
  }
  function documentHTML(scripts,editable=false){return scripts.map((e,i)=>`<section class="${editable?'screenplay-episode':'version-episode'}" translate="no" data-document-episode="${e.number}">${editable?`<header class="episode-cover"><div>第${e.number}集</div><h1>${field(e.title,`scripts.${i}.title`,`第 ${e.number} 集标题`)}</h1></header>`:`<h2>第 ${e.number} 集 · ${esc(e.title)}</h2>`}${editable&&!SceneAI.hasScriptContent(e)?emptyEpisode(host.project(),e):''}${e.scenes.map((s,j)=>`<article class="${editable?'screenplay-scene':'version-scene'}" data-document-scene="${esc(s.id)}" ${attrs(i,j)}>${editable?`<h2 class="screenplay-heading">${field(s.heading,`scripts.${i}.scenes.${j}.heading`,`第 ${e.number} 集 场景 ${j+1} 标题`)}</h2>${s.blocks.map((b,k)=>blockMarkup(b,i,j,k)).join('')}<div class="scene-insert">${action('＋ 添加段落','insert',attrs(i,j),'insert-paragraph')}</div>`:`<h3>场景 ${String(j+1).padStart(2,'0')} · ${esc(s.heading)}</h3><p class="version-scene-heading">${esc(s.heading)}</p>${s.blocks.map(b=>`<div class="version-block" data-block-kind="${b.type}">${C.blockText(b).split('\n').map(t=>`<p>${esc(t)||'<br>'}</p>`).join('')}</div>`).join('')}`}</article>`).join('')}</section>`).join('');}
  function directory(){const p=host.project();return `<nav class="scene-directory" aria-label="分集与场景"><header><strong>场景目录 <small>${p.scripts.reduce((n,e)=>n+e.scenes.length,0)} 场</small></strong>${action('＋','add-scene','aria-label="添加场景"','directory-add')}</header><div class="scene-index">${p.scripts.map((e,i)=>`<section><h3 translate="no">EP${String(e.number).padStart(2,'0')} · ${esc(e.title)}</h3>${e.scenes.map((s,j)=>`<div class="scene-index-row ${s.id===ui.sceneId?'active':''}" data-index-scene="${s.id}">${action(`<span>${String(j+1).padStart(2,'0')}</span><strong translate="no">${esc(s.heading)}</strong>`,'jump',`data-id="${s.id}" ${attrs(i,j)}`,'scene-jump')}<div class="scene-index-actions"><input type="checkbox" title="选择场景" aria-label="选择第 ${e.number} 集场景 ${j+1}" data-scene-select="${s.id}" ${host.selectedScenes.has(s.id)?'checked':''}>${action('♧','remove-scene',`${attrs(i,j)} aria-label="删除第 ${e.number} 集场景 ${j+1}"`,'scene-delete')}</div></div>`).join('')}</section>`).join('')}${action('＋ 添加分集','add-episode','','add-episode')}</div><footer><button class="button small" data-action="generate-all-scripts">一键生成全部剧本</button><p>双击场景名编辑 · F2</p></footer></nav>`;}
  function view(){const current=selected();return `<div class="module-body screenplay-layout ${ui.focus?'focus-mode':''} ${ui.directory?'directory-open':''}">${directory()}<section class="continuous-panel"><header class="screenplay-toolbar"><div class="screenplay-location"><div>${action('☰','directory','aria-label="切换场景目录"','directory-toggle')}<strong class="current-scene-label" translate="no">${esc(current?.s.heading||'剧本')}</strong>${action('◉ '+(ui.focus?'退出专注':'专注模式'),'focus','','focus-toggle')}</div><small>Tab 切换格式 · Enter 新建块 · / 打开菜单</small></div><div class="screenplay-format" title="切换同一份标准剧本的排版方式，不会重新生成或改写正文"><span>全文格式</span><div role="group" aria-label="剧本格式">${action('亚洲格式','layout',`data-layout="asian" aria-pressed="${ui.layout==='asian'}"`,ui.layout==='asian'?'active':'')}${action('好莱坞格式','layout',`data-layout="hollywood" aria-pressed="${ui.layout==='hollywood'}"`,ui.layout==='hollywood'?'active':'')}</div></div></header><div class="continuous-scroll"><div class="screenplay-paper format-${ui.layout}" role="group" aria-label="剧本连续编辑区">${documentHTML(host.project().scripts,true)||'<p class="empty">添加分集和场景，开始编写剧本。</p>'}</div></div></section></div>`;}
  function versions(p,versionId,date){const v=p.snapshots.find(v=>v.id===versionId);return `<div class="module-body version-workspace"><aside class="history-sidebar"><header><strong>版本历史</strong><button class="button small" data-action="snapshot">＋ 创建快照</button></header><div class="history-list"><button class="history-item ${!v?'active':''}" data-action="version" data-id="current"><strong>当前剧本 <span>当前</span></strong><time>${date(p.updatedAt)}</time><em>实时内容</em></button>${p.snapshots.map(s=>`<button class="history-item ${s===v?'active':''}" data-action="version" data-id="${s.id}"><strong translate="no">${esc(s.name)}</strong><time>${date(s.createdAt)}</time><em translate="no">${esc(s.note)}</em></button>`).join('')}${p.snapshots.length?'':'<p class="history-empty">尚无历史版本。点击“创建快照”保存当前剧本。</p>'}</div><footer>共 ${p.snapshots.length} 个可见版本 · 不会自动删除</footer></aside><section class="version-reader"><header><strong translate="no">${v?esc(v.name):'当前剧本 · 当前版本'}</strong><span>${date(v?.createdAt||p.updatedAt)} · ${v?'历史快照':'实时内容'}</span>${v?'<button class="button small" data-action="restore-version">恢复此版本</button>':''}</header><div class="version-document" aria-label="${v?'历史快照正文':'当前剧本正文'}">${documentHTML((v?.payload||p).scripts)||'<p class="history-empty">暂无剧本内容。</p>'}</div></section></div>`;}
  function locate(el){const i=Number(el.dataset.episodeIndex),j=Number(el.dataset.sceneIndex),k=Number(el.dataset.blockIndex),e=host.project().scripts[i],s=e?.scenes[j];return {i,j,k,e,s,b:s?.blocks[k]};}
  function selectScene(id,scroll=false){ui.sceneId=id;const current=selected();if(!current)return;host.setEpisode(current.e.number);document.querySelectorAll('[data-index-scene]').forEach(n=>n.classList.toggle('active',n.dataset.indexScene===id));const heading=document.querySelector('.current-scene-label');if(heading)heading.textContent=current.s.heading;const target=document.querySelector('.coauthor-target');if(target)target.textContent=`第${current.e.number}集 · 第${current.j+1}场 · ${current.s.heading}`;if(scroll)document.querySelector(`[data-document-scene="${id}"]`)?.scrollIntoView({block:'start',behavior:'instant'});}
  function focusPath(path){const node=document.querySelector(`[data-script-path="${path}"]`);if(node){ignoreFocus=true;node.focus();ignoreFocus=false;const range=document.createRange();range.selectNodeContents(node);range.collapse(false);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);}}
  function changed(){ui.paragraphs=[];host.changed();}
  function addBlock(i,j,k,type='action',text='',remember=true){const s=host.project().scripts[i]?.scenes[j];if(!s||s.blocks.length>=300)throw new Error('每场最多 300 段');if(remember)host.remember();s.blocks.splice(k,0,{type,text,speaker:'',parenthetical:''});changed();host.render();focusPath(`scripts.${i}.scenes.${j}.blocks.${k}.text`);}
  function typeChange(el,type){const target=locate(el);if(!target.b)return;host.remember();const b=target.b;if(type!=='dialogue'&&b.type==='dialogue'){b.text=C.blockText(b);b.speaker='';b.parenthetical='';}b.type=type;changed();host.render();focusPath(`scripts.${target.i}.scenes.${target.j}.blocks.${target.k}.text`);}
  function blockMenu(el){const {i,j,k,s}=locate(el);if(!s)return;ui.paragraph={i,j,k};host.show('段落菜单',`<div class="block-menu-options">${types.map(([value,name])=>action(name,'type',`${attrs(i,j,k)} data-type="${value}"`,'button')).join('')}</div>`,action('在后面插入','insert',attrs(i,j,k),'button')+action('删除段落','delete-block',attrs(i,j,k),'button danger')+'<button class="button" data-action="close-dialog">关闭</button>');}
  function targetScripts(){const p=host.project(),current=selected();if(ui.scope==='all')return C.clone(p.scripts);if(ui.scope==='paragraphs'){if(!ui.paragraphs.length)throw new Error('请先在正文中选中段落');return p.scripts.map((e,i)=>({...C.clone(e),scenes:e.scenes.map((s,j)=>({...C.clone(s),blocks:s.blocks.filter((b,k)=>ui.paragraphs.some(t=>t.i===i&&t.j===j&&t.k===k)).map(C.clone)})).filter(s=>s.blocks.length)})).filter(e=>e.scenes.length);}if(!current)throw new Error('请先选择一个场景');if(ui.scope==='selected'){const data=p.scripts.map(e=>({...C.clone(e),scenes:e.scenes.filter(s=>host.selectedScenes.has(s.id)).map(C.clone)})).filter(e=>e.scenes.length);if(!data.length)throw new Error('请在场景目录中勾选场景');return data;}if(ui.scope==='paragraph'){const loc=ui.paragraph,s=loc&&p.scripts[loc.i]?.scenes[loc.j],b=s?.blocks[loc.k];if(!b)throw new Error('请先点击一个正文段落');return [{...C.clone(p.scripts[loc.i]),scenes:[{...C.clone(s),blocks:[C.clone(b)]}]}];}return [{...C.clone(current.e),scenes:[C.clone(current.s)]}];}
  async function send(){if(!ui.instruction.trim()||ui.working)return;if(!host.model().configured){host.modelSettings();return;}const scripts=targetScripts(),original=C.clone(host.project()),at=original.updatedAt,selection=C.clone(ui.scope==='paragraphs'?ui.paragraphs:ui.paragraph),scope=ui.scope,task=ui.task;ui.working=true;coauthorController=new AbortController();ui.reply='';ui.pending=null;host.render();try{const result=await SceneAI.request({task:'coauthor',mode:task,scope,scripts,instruction:ui.instruction},original,coauthorController.signal);if(host.project().id!==original.id)throw new Error('已切换项目，请重新发起共创');if(['讨论','总结'].includes(task))ui.reply=result.content;else{const data=result.data;if(!Array.isArray(data)||data.length!==scripts.length)throw new Error('返回的剧本结构不正确');const validated=data.map((e,i)=>{if(e.number!==scripts[i].number||!Array.isArray(e.scenes)||e.scenes.length!==scripts[i].scenes.length)throw new Error('返回的分集或场景数量发生变化');const scenes=C.cleanScenes(e.scenes);if(scenes.some((s,j)=>s.id!==scripts[i].scenes[j].id))throw new Error('返回的场景编号不匹配');return {...scripts[i],scenes};});ui.reply=validated.map(e=>e.scenes.map(s=>s.heading+'\n\n'+s.blocks.map(C.blockText).join('\n\n')).join('\n\n')).join('\n\n');if(scope==='paragraphs'&&validated.some((e,i)=>e.scenes.some((s,j)=>s.blocks.length!==scripts[i].scenes[j].blocks.length)))throw new Error('选中段落模式需要保持段落数量，请改用当前场景进行续写');ui.pending={scripts:validated,at,projectId:original.id,selection,scope};}}catch(e){ui.reply=e.name==='AbortError'?'生成已取消，正文未修改。':'未完成：'+e.message;}finally{ui.working=false;host.render();}}
  async function handle(name,el){const current=selected();switch(name){
    case 'boards':await host.handle('generate-boards',{dataset:{number:current?.e.number}});break;
    case 'jump':selectScene(el.dataset.id,true);break;
    case 'layout':ui.layout=el.dataset.layout;host.render();break;
    case 'focus':ui.focus=!ui.focus;host.render();break;
    case 'directory':ui.directory=!ui.directory;host.render();break;
    case 'task':ui.task=el.dataset.task;host.render();break;
    case 'add-episode':await host.handle('add-script',el);break;
    case 'add-scene':{const e=current?.e||host.project().scripts[0];if(!e){await host.handle('add-script',el);return;}if(e.scenes.length>=100)throw new Error('每集最多 100 个场景');host.remember();const scene={id:C.uid('scene'),heading:'外景 地点 - 日',blocks:[SceneData.action('')]};e.scenes.push(scene);ui.sceneId=scene.id;changed();host.render();selectScene(scene.id,true);focusPath(`scripts.${host.project().scripts.indexOf(e)}.scenes.${e.scenes.length-1}.heading`);break;}
    case 'remove-scene':{const t=locate(el);host.setEpisode(t.e.number);await host.handle('remove-scene',{dataset:{index:String(t.j)}});break;}
    case 'insert':{const t=locate(el);host.close();addBlock(t.i,t.j,Number.isInteger(t.k)?t.k+1:t.s.blocks.length);break;}
    case 'block-menu':blockMenu(el);break;
    case 'type':host.close();typeChange(el,el.dataset.type);break;
    case 'delete-block':{const t=locate(el);host.remember();t.s.blocks.splice(t.k,1);host.close();changed();host.render();break;}
    case 'send':await send();break;
    case 'cancel':coauthorController?.abort();break;
    case 'parse':await host.handle('parse-entities',el);break;
    case 'apply-entities':{const result=ui.entities,p=host.project();if(!result||result.projectId!==p.id)throw new Error('项目已经切换，请重新解析');const additions=result.values.filter(v=>!p.entities.some(e=>e.type===v.type&&e.name===v.name));if(p.entities.length+additions.length>500)throw new Error('主体库数量超过限制');host.remember();p.entities.push(...additions.map(v=>({id:C.uid('entity'),type:v.type,name:v.name,description:v.description,status:'待确认'})));ui.entities=null;changed();host.close();host.toast('解析资料已写入主体库，等待确认');break;}
    case 'discard':ui.pending=null;ui.reply='';host.render();break;
    case 'adopt':{const job=ui.pending,p=host.project();if(!job||job.projectId!==p.id||job.at!==p.updatedAt)throw new Error('正文已变化，请重新生成，避免覆盖新修改');const candidate=C.clone(p);if(job.scope==='paragraphs'){for(const entry of job.scripts){const i=candidate.scripts.findIndex(e=>e.number===entry.number);for(const scene of entry.scenes){const j=candidate.scripts[i].scenes.findIndex(s=>s.id===scene.id),keys=job.selection.filter(t=>t.i===i&&t.j===j).sort((a,b)=>a.k-b.k);if(keys.length!==scene.blocks.length)throw new Error('选中段落数量不匹配');keys.forEach((t,n)=>candidate.scripts[i].scenes[j].blocks[t.k]=C.clone(scene.blocks[n]));}}}else if(job.scope==='paragraph'){const {i,j,k}=job.selection;candidate.scripts[i].scenes[j].blocks.splice(k,1,...job.scripts[0].scenes[0].blocks);}else for(const e of job.scripts){const existing=candidate.scripts.find(x=>x.number===e.number);for(const s of e.scenes){const j=existing.scenes.findIndex(x=>x.id===s.id);existing.scenes[j]=C.clone(s);}}C.cleanProject(candidate);host.remember();C.snapshot(p,'AI 共创前的自动快照','接受共创修改前保存');p.scripts=candidate.scripts;ui.pending=null;ui.reply='修改已写入正文；接受前的版本已保存为快照。';changed();host.render();break;}
  }}
  function configure(callbacks){host=callbacks;
    document.addEventListener('selectionchange',()=>{const selection=window.getSelection();if(!selection||selection.isCollapsed||!selection.rangeCount)return;const range=selection.getRangeAt(0),paper=document.querySelector('.screenplay-paper');if(!paper||!paper.contains(range.commonAncestorContainer))return;const rows=Array.from(paper.querySelectorAll('.screenplay-row')).filter(row=>range.intersectsNode(row));if(rows.length)ui.paragraphs=rows.map(row=>{const {i,j,k}=locate(row);return {i,j,k};});});
    document.addEventListener('click',e=>{const el=e.target.closest('[data-action^="sc-"]');if(el&&!el.disabled)handle(el.dataset.action.slice(3),el).catch(error=>host.toast(error.message));});
    document.addEventListener('focusin',e=>{const el=e.target.closest('[data-script-path]');if(!el)return;if(!ignoreFocus)host.remember();const scene=el.closest('[data-document-scene]');if(scene)selectScene(scene.dataset.documentScene);const row=el.closest('[data-block-index]');if(row){const {i,j,k}=locate(row);ui.paragraph={i,j,k};const option=document.querySelector('#coauthor-scope option[value="paragraph"]');if(option)option.disabled=false;}});
    document.addEventListener('input',e=>{const el=e.target;if(el.dataset.scriptPath){const keys=el.dataset.scriptPath.split('.');let value=host.project();for(const key of keys.slice(0,-1))value=value[key];const text=el.innerText.replace(/\r\n/g,'\n'),limit=keys.at(-1)==='title'?200:keys.at(-1)==='heading'?500:50000;if(text.length>limit){host.toast('内容超出长度限制，已保留允许长度');el.textContent=text.slice(0,limit);}value[keys.at(-1)]=text.slice(0,limit);changed();if(keys.at(-1)==='heading'){selectScene(ui.sceneId);const label=document.querySelector(`[data-index-scene="${ui.sceneId}"] .scene-jump strong`);if(label)label.textContent=text.slice(0,limit);}}if(el.id==='coauthor-instruction'){ui.instruction=el.value;const send=document.querySelector('[data-action="sc-send"]');if(send)send.disabled=ui.working||!ui.instruction.trim();const hint=document.querySelector('.coauthor-validation');if(hint)hint.textContent=ui.instruction.trim()?'生成结果需要你审阅':'请填写要讨论的问题';}});
    document.addEventListener('change',e=>{if(e.target.matches('[data-block-type]'))typeChange(e.target,e.target.value);if(e.target.id==='coauthor-scope')ui.scope=e.target.value;});
    document.addEventListener('dblclick',e=>{const el=e.target.closest('.scene-jump');if(!el)return;const t=locate(el);selectScene(t.s.id,true);focusPath(`scripts.${t.i}.scenes.${t.j}.heading`);});
    document.addEventListener('keydown',e=>{
      const el=e.target.closest('[data-script-path]');
      if(e.isComposing||e.keyCode===229)return;
      if(e.key==='F2'&&document.querySelector('.screenplay-layout')){e.preventDefault();const t=selected();if(t)focusPath(`scripts.${t.i}.scenes.${t.j}.heading`);return;}
      if(!el)return;
      if((e.ctrlKey||e.metaKey)&&['z','y'].includes(e.key.toLowerCase())){e.preventDefault();host.undoRedo(e.key.toLowerCase()==='y'||e.shiftKey);return;}
      const row=el.closest('[data-block-index]');if(!row)return;const t=locate(row);
      if(e.key==='Tab'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();const index=types.findIndex(([key])=>key===t.b.type);typeChange(row,types[(index+(e.shiftKey?types.length-1:1))%types.length][0]);}
      else if(e.key==='/'&&!e.shiftKey){e.preventDefault();blockMenu(row);}
      else if(e.key==='Enter'&&!e.shiftKey){
        e.preventDefault();if(!el.dataset.scriptPath.endsWith('.text')){focusPath(`scripts.${t.i}.scenes.${t.j}.blocks.${t.k}.text`);return;}
        if(t.s.blocks.length>=300){host.toast('每场最多 300 段');return;}
        const selection=window.getSelection(),range=selection.rangeCount?selection.getRangeAt(0):null;let tail='';host.remember();
        if(range&&el.contains(range.startContainer)&&el.contains(range.endContainer)){const before=range.cloneRange();before.selectNodeContents(el);before.setEnd(range.startContainer,range.startOffset);const after=range.cloneRange();after.selectNodeContents(el);after.setStart(range.endContainer,range.endOffset);tail=after.toString();t.b.text=before.toString();}
        addBlock(t.i,t.j,t.k+1,'action',tail,false);
      }
    });
    document.addEventListener('dragstart',e=>{const handle=e.target.closest('.drag-block');if(!handle)return;const {i,j,k}=locate(handle);ui.drag={i,j,k};e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','screenplay-paragraph');});
    document.addEventListener('dragover',e=>{if(ui.drag&&e.target.closest('.screenplay-row'))e.preventDefault();});
    document.addEventListener('drop',e=>{const row=e.target.closest('.screenplay-row');if(!row||!ui.drag)return;e.preventDefault();const target=locate(row),from=ui.drag;ui.drag=null;if(target.i!==from.i||target.j!==from.j){host.toast('段落可在同一场景内拖动排序');return;}host.remember();const blocks=target.s.blocks;blocks.splice(target.k,0,blocks.splice(from.k,1)[0]);changed();host.render();});
    document.addEventListener('dragend',()=>{ui.drag=null;});
  }
  function capture(){const el=document.querySelector('.continuous-scroll');if(el){ui.scroll=el.scrollTop;el._sceneObserver?.disconnect();}}
  function mount(){const el=document.querySelector('.continuous-scroll');if(el){el.scrollTop=ui.scroll;const observer=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);if(visible.length&&!document.activeElement?.matches('[data-script-path]'))selectScene(visible[0].target.dataset.documentScene);},{root:el,rootMargin:'0px 0px -65% 0px',threshold:0});document.querySelectorAll('.screenplay-scene').forEach(n=>observer.observe(n));el._sceneObserver=observer;}}
  function nav(){return `<div class="script-nav-actions"><button class="button small" data-action="snapshot" data-script-save>✓ 版本已保存</button><button class="icon-button" data-action="undo" title="撤销" aria-label="撤销">↶</button><button class="icon-button" data-action="redo" title="重做" aria-label="重做">↷</button><button class="button small" data-action="generate-script">生成本集剧本</button>${host.project().bible.outlines.length>1?'<button class="button small" data-action="generate-all-scripts">生成多集剧本</button>':''}<button class="button primary small" data-action="sc-boards">生成本集 AI 分镜</button><button class="button small parse-script" data-action="sc-parse">⚒ AI 解析剧本</button></div>`;}
  globalThis.SceneEditor={configure,view,versions,documentHTML,capture,mount,nav,emptyEpisode};
})();

SceneEditor=globalThis.SceneEditor;

// platform-ui.js
(() => {
  const esc=SceneCore.esc;
  let host,current=null,status=null,projects=[],links=[],receipt=null,cursor=null,pending=false,controller=null;
  const $=s=>document.querySelector('#dialog '+s);
  const btn=(label,action,primary=false)=>`<button type="button" class="button ${primary?'primary':''}" data-action="platform-${action}">${label}</button>`;
  async function api(path,body,signal){const r=await fetch('/api/platform/'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},signal,...(body===undefined?{}:{body:JSON.stringify(body)})});const data=await r.json();if(!r.ok)throw new Error(data.error||'制作资料读取失败');return data;}
  function message(text,error=false){const el=$('[data-platform-message]');if(el){el.className='notice '+(error?'warning':'subtle');el.textContent=text;}}
  function linkedTarget(episode=host.episode()){return links.find(row=>row.source_project_id===host.project().id&&row.episode===episode);}
  function options(selected=linkedTarget()?.project_id||globalThis.StoryHost?.targetProject||'new',episode=host.episode()){
    const known=projects.slice(),link=linkedTarget(episode);if(link?.project_id&&!known.some(p=>p.id===link.project_id))known.unshift({id:link.project_id,title:link.title+'（已关联）',shots:'待核对'});
    return '<option value="">仅检查 / 导出制作资料</option>'+`<option value="new" ${selected==='new'?'selected':''}>新建本集制作记录</option>`+known.map(p=>`<option value="${esc(p.id)}" ${selected===p.id?'selected':''}>${esc(p.title)} · ${p.shots} 镜</option>`).join('');
  }
  function body(){
    if(!status.authenticated)return '<div class="notice warning" role="alert">登录状态已失效，请重新登录后继续视频制作。</div>';
    const p=host.project();
    return `<div class="platform-intro"><span class="platform-kicker">剧本 → 视频制作</span><p>选择要制作的分集，检查剧本、人物和分镜，确认后继续准备首尾帧和视频。</p></div>
      <div class="card-actions">${btn('刷新制作记录','refresh')}</div>
      <div class="row platform-selectors"><div class="field"><label for="platform-episode">制作分集</label><select id="platform-episode">${p.scripts.map(e=>`<option value="${e.number}" ${e.number===host.episode()?'selected':''}>第 ${e.number} 集 · ${esc(e.title)}</option>`).join('')}</select></div><div class="field"><label for="platform-target">制作记录</label><select id="platform-target">${options()}</select>${cursor?btn('加载更多记录','more'):''}</div></div>
      <p class="muted">各集制作记录会与剧本、分镜一起归入同一个故事项目，可从“我的项目”继续创作。</p>
      <div data-platform-message class="notice subtle" role="status">先检查本集内容，确认后保存制作资料。</div><div data-platform-preview></div>`;
  }
  async function loadProjects(reset=true){const page=await api('projects'+(!reset&&cursor?'?cursor='+encodeURIComponent(cursor):''));projects=reset?page.items:projects.concat(page.items);cursor=page.next_cursor||null;}
  function render(){current=null;host.show('视频制作准备',body(),(status.authenticated?btn('检查制作准备','preview',true)+btn('导出制作资料','export'):'')+'<button class="button" data-action="close-dialog">关闭</button>');}
  async function open(choice){status=await api('status');projects=[];links=[];receipt=null;cursor=null;let error='';if(status.authenticated){try{await loadProjects();links=(await api('links')).items;}catch(e){error=e.message;}}render();if(choice&&status.authenticated){$('#platform-episode').value=String(choice.episode);$('#platform-target').value=choice.create_target?'new':choice.target_id||'';}if(error)message(error,true);}
  async function resumeProduction(){
    if(host.preflight&&!host.preflight(host.episode()))return;
    const account=await api('status');
    if(account.authenticated){
      const rows=(await api('links')).items;
      const link=rows.find(row=>row.source_project_id===host.project().id&&row.episode===host.episode()&&row.status==='complete'&&row.project_id);
      if(link){host.production(link);return;}
    }
    await open();
  }
  function selected(){const value=$('#platform-target').value;return {episode:Number($('#platform-episode').value),target_id:value==='new'?'':value,create_target:value==='new'};}
  async function preview(){
    const choice=selected();if(host.preflight&&!host.preflight(choice.episode))return;
    const snapshot=SceneCore.clone(host.project()),signature=JSON.stringify(snapshot),anchor=$('[data-platform-preview]');
    current=null;anchor.innerHTML='';const run=new AbortController();controller=run;
    const check=()=>{if(run.signal.aborted||!anchor.isConnected)throw new DOMException('已取消','AbortError');if(JSON.stringify(host.project())!==signature||JSON.stringify(selected())!==JSON.stringify(choice))throw new Error('原稿或制作记录已变化，整理结果未采用，请重新检查');};
    let plan;
    try{
      plan=await api('plan',{project:snapshot,...choice},run.signal);check();
      if(plan.ready&&plan.missing_fields.length){
        anchor.innerHTML='<div class="notice subtle"><strong>正在自动整理制作字段</strong><p>使用当前创作模型补齐镜头作用、首尾状态、动作与衔接。原剧本、镜头时长和对白保持。每批完成后保存整理结果，关闭可取消，重试会继续未完成的镜头。</p>'+btn('取消整理','cancel')+'</div>';
        const total=plan.missing_fields.length;let done=0;
        while(plan.missing_fields.length){
          check();const ids=plan.missing_fields.slice(0,5).map(s=>s.shotId);
          message('已整理 '+done+' / '+total+' 镜，正在请求创作模型…');
          const generated=await SceneAI.request({task:'handoff-plan',episode:choice.episode,shotIds:ids},snapshot,run.signal,progress=>{if(anchor.isConnected)message('已整理 '+done+' / '+total+' 镜 · '+progress.message);});
          check();plan=await api('plan',{project:snapshot,...choice,source_key:plan.source_key,preparation:generated.data},run.signal);check();
          const next=total-plan.missing_fields.length;if(next<=done)throw new Error('制作字段仍未补齐，请重试整理');done=next;
        }
      }
      check();current=plan;
    }finally{if(controller===run)controller=null;}
    let html=`<section class="platform-review"><h3>第 ${plan.source.episode} 集 · ${esc(plan.source.episode_title)}</h3><div class="platform-metrics"><span>${plan.characters.length} 位人物</span><span>${plan.shots.length} 镜</span><span>剪辑 ${plan.planned_seconds} 秒 / 目标  ${plan.duration_range?EventPlan.rangeLabel(plan.duration_range.min,plan.duration_range.max):plan.target_seconds??'未设'} 秒</span></div>`;
    if(plan.issues.length)html+='<div class="notice warning"><strong>需要先处理</strong><ul>'+plan.issues.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>'+(plan.can_repair_storyboard?'<p>AI 会保留已确认事件与对白，修正分镜分配和提示词；如需删改，须返回事件与时长确认。先预览，采用前保存旧分镜快照；剧本正文保留。</p>'+btn('AI 修正分镜并继续','repair',true):'')+'</div>';
    html+='<ul class="platform-warnings">'+plan.warnings.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>';
    if(plan.production_ready&&plan.shots.length)html+='<div class="notice"><strong>制作文字字段已齐全</strong><p>请核对模型整理的内容；确认后保存本集制作资料。首尾帧图片和视频素材将在制作阶段准备。</p></div>'+plan.shots.map((shot,i)=>'<details class="platform-shot-review"><summary>第 '+(i+1)+' 镜 · '+esc(shot.title)+' · '+shot.edit_duration_seconds+' 秒</summary><dl>'+Object.entries(ProductionFields.labels).filter(([key])=>shot[key]).map(([key,label])=>'<dt><strong>'+label+'</strong></dt><dd>'+esc(shot[key])+'</dd>').join('')+'</dl></details>').join('');
    if(plan.create_target)html+=`<div class="notice subtle">${plan.production_ready?'确认后创建':'修正并通过检查后，才可创建'}“${esc(plan.target.title)}”，写入本集剧本、人物${plan.shots.length?'和分镜':''}，并归入当前故事项目。以后可从“我的项目”直接继续制作。</div>`;
    else if(plan.unchanged)html+=`<div class="notice subtle">本集内容与制作记录一致，继续使用已有角色图、参考帧和视频，不会重置制作进度。</div>`;
    else if(plan.target)html+=`<div class="notice warning">制作记录：${esc(plan.target.title)}（版本 ${plan.target.version}）。将更新该项目的剧本和同名人物资料${plan.shots.length?'，并替换全部 '+plan.target.existing_shots+' 个现有镜头，重置这些镜头的媒体关联和配乐安排':'，保留现有分镜'}。人物或视觉风格变化可能使已有媒体失效。剧本原稿和历史版本会保留。</div>`;
    html+=`${plan.ready&&plan.plan_id?`<div class="card-actions">${btn(plan.create_target?'创建制作记录':plan.unchanged?'保留现有进度并继续':'更新制作资料','apply',true)}</div>`:''}</section>`;
    $('[data-platform-preview]').innerHTML=html;message(plan.production_ready?'制作文字检查通过。'+(plan.target?'请核对制作内容、所选记录和替换范围。':'选择制作记录后再次检查，即可保存。'):'发现 '+plan.issues.length+' 项不兼容内容。先处理这些问题后，模型会继续补齐制作字段。',!plan.ready);
  }
  async function handle(action){if(!action.startsWith('platform-'))return false;if(action==='platform-cancel'){controller?.abort();return true;}if(pending)return true;pending=true;
    document.querySelectorAll('#dialog [data-action^="platform-"]').forEach(b=>b.disabled=true);
    document.querySelectorAll('#dialog .platform-selectors select').forEach(s=>s.disabled=true);
    try{
      switch(action.slice(9)){
        case 'refresh':await loadProjects();links=(await api('links')).items;render();break;
        case 'more':{const value=$('#platform-target').value;await loadProjects(false);$('#platform-target').innerHTML=options(value,selected().episode);if(!cursor)$('[data-action="platform-more"]')?.remove();break;}
        case 'preview':message('正在检查本集制作资料…');await preview();break;
        case 'repair':if(!current?.can_repair_storyboard)throw new Error('请先检查当前分镜');await host.repairBoards(selected());break;
        case 'apply':{
          if(!current?.plan_id||current.source.project_id!==host.project().id||current.source.updated_at!==host.project().updatedAt||current.source.episode!==selected().episode||!!current.create_target!==selected().create_target||(!current.create_target&&current.target.id!==selected().target_id))throw new Error('内容或制作记录已变化，请重新预览');
          message('正在保存剧本、人物与分镜，请勿关闭窗口…');
          receipt=await api('apply',{plan_id:current.plan_id,confirmed:true});receipt.source_project_id=current.source.project_id;
          $('[data-platform-preview]').innerHTML=`<div class="notice"><strong>制作资料已保存</strong><p>第 ${receipt.episode} 集已准备好制作资料，当前版本 ${receipt.version}。</p>${btn('进入本集视频制作','production',true)}</div>`;current=null;message('本集制作资料已保存，可继续视频制作。剧本原稿和历史版本会保留。');break;
        }
        case 'production':if(receipt)host.production(receipt);break;
        case 'export':{
          const plan=await api('plan',{project:host.project(),episode:selected().episode});
          const r=await fetch('/api/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'制作资料-第'+plan.source.episode+'集.json',content:JSON.stringify(plan,null,2)})}),data=await r.json();if(!r.ok)throw new Error(data.error);message('制作资料已导出：'+data.path);break;
        }
      }
    }catch(e){if($('[data-action="platform-cancel"]'))$('[data-platform-preview]').innerHTML='';if(e.name==='AbortError')message('已取消整理。已完成的整理结果已保存，可继续检查；制作记录尚未更新。');else message(e.message,true);}finally{pending=false;document.querySelectorAll('#dialog [data-action^="platform-"]').forEach(b=>b.disabled=false);document.querySelectorAll('#dialog .platform-selectors select').forEach(s=>s.disabled=false);}return true;
  }
  globalThis.PlatformUI={configure:value=>{host=value;},open,resumeProduction,handle};
  document.getElementById('dialog').addEventListener('close',()=>controller?.abort());
  document.getElementById('dialog').addEventListener('cancel',()=>controller?.abort());
  document.addEventListener('change',event=>{if(event.target.id==='platform-episode'){current=null;$('#platform-target').innerHTML=options(linkedTarget(Number(event.target.value))?.project_id||'new',Number(event.target.value));$('[data-platform-preview]').innerHTML='';}});
})();

PlatformUI=globalThis.PlatformUI;

// app.js
(async () => {
  'use strict';
  const access=await StoryHost.authenticate();if(!access)return;
  const C=SceneCore,A=SceneAI,{clone,esc,uid}=C,$=s=>document.querySelector(s),app=$('#app'),dialog=$('#dialog');
  const sections=[['core','故事核心'],['world','世界与规则'],['structure','总体结构'],['outlines','分集大纲']];
  const modules=[['bible','创作圣经','bible'],['characters','人物小传','users'],['script','剧本','file'],['boards','AI 分镜','camera'],['analysis','创作分析','spark'],['version','版本管理','clock'],['export','导出','download']];
  const paths={home:'m3 10 9-7 9 7v11h-6v-7H9v7H3z',project:'M3 4h18v13H3z M12 17v4 M8 21h8',users:'M8 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M2 21v-5a6 6 0 0 1 12 0v5 M16 4a3 3 0 0 1 0 6 M18 14a4 4 0 0 1 4 4v3',user:'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M4 21v-3a8 8 0 0 1 16 0v3',settings:'m10 2-1 3-3 1-3-1-2 4 2 2v3l-2 2 2 4 3-1 3 1 1 3h4l1-3 3-1 3 1 2-4-2-2v-3l2-2-2-4-3 1-3-1-1-3z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',bible:'m12 2 5 3v6l-5 3-5-3V5z M12 8l5-3 M7 5l5 3v6 M7 11l-5 3v6l5 3 5-3v-6 M12 14l5-3 5 3v6l-5 3-5-3 M2 14l5 3 5-3 M7 17v6 M12 14l5 3 5-3 M17 17v6',book:'M12 6v15 M12 6C8 2 5 3 2 3v15c4 0 6 0 10 3 4-3 6-3 10-3V3c-3 0-6-1-10 3',file:'M6 3h9l4 4v14H6z M14 3v5h5 M9 12h7 M9 16h7',clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v6h4',download:'M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5',upload:'M12 16V4 m-5 5 5-5 5 5 M4 16v5h16v-5',camera:'M3 6h5l2-3h4l2 3h5v15H3z M12 9a4 4 0 1 0 0 8 4 4 0 0 0 0-8',back:'M20 12H4 m6-6-6 6 6 6',check:'m4 12 5 5L20 6',refresh:'M20 8a8 8 0 0 0-14-3L3 8 M3 3v5h5 M4 16a8 8 0 0 0 14 3l3-3 M21 21v-5h-5',plus:'M12 4v16 M4 12h16',close:'m6 6 12 12 M18 6 6 18',trash:'M3 6h18 M8 6V3h8v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',edit:'m4 17-1 4 4-1L20 7l-3-3z M14 7l3 3',spark:'m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z',undo:'m8 5-5 5 5 5 M3 10h11a6 6 0 0 1 0 12',redo:'m16 5 5 5-5 5 M21 10H10a6 6 0 0 0 0 12',film:'M3 3h18v18H3z M7 3v18 M17 3v18 M3 8h4 M3 16h4 M17 8h4 M17 16h4',copy:'M9 7h12v14H9z M5 17H3V3h12v2',dots:'M5 12h.01 M12 12h.01 M19 12h.01',help:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M9 8a3 3 0 1 1 4 3c-1 1-1 2-1 3 M12 17h.01'};
  const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.file}"/></svg>`;
  const button=(text,action,ico='',className='',extra='')=>`<button type="button" class="button ${className}" data-action="${action}" ${extra}>${ico?icon(ico):''}${text}</button>`;
  const ib=(label,action,ico,extra='')=>`<button type="button" class="icon-button" title="${esc(label)}" aria-label="${esc(label)}" data-action="${action}" ${extra}>${icon(ico)}</button>`;
  const seed=C.cleanProject(SceneData.blankProject('我的剧本'));
  let state={schemaVersion:1,updatedAt:new Date().toISOString(),activeId:seed.id,locale:'zh',projects:[seed]};
  let module='bible',section='core',episode=1,versionId='current',entityType='角色',showIgnored=false,selectedScenes=new Set(),format='txt',scope='all',novelStyle='第三人称全知';
  let filmId='',novelId='',serverConnected=false,diskSafe=true,diskTag=null,model={configured:false,managed:!!StoryHost.managedModel},saveLabel='已保存',saveTimer,toastTimer,saveQueue=Promise.resolve(),undo=[],redo=[],historyProject=seed.id,aiJob=null,aiResult=null,aiController=null,busy=false,search='';
  const KEY='storyfusion-local-workspace-v1:'+access.workspace_key;
  StoryHost.onDispose?.(async()=>{EventPlanUI.cancel();analysisUI?.dispose();aiController?.abort();SceneEditor.capture();clearTimeout(saveTimer);try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}if(saveLabel==='保存中')await save();await saveQueue;});
  const project=()=>state.projects.find(p=>p.id===state.activeId)||state.projects[0];
  let analysisUI=null;
  function getAnalysis(){return analysisUI||(analysisUI=ReelMentorUI.create({project,request:A.request,save,changed:markChanged,render,toast,esc,button,download:saveFile,ready:()=>{if(busy){toast('请先完成当前生成任务');return false;}if(!serverConnected||!diskSafe){toast('请先恢复项目保存连接');return false;}if(!model.configured){modelSettings();return false;}return true;}}));}
  const ep=()=>project().scripts.find(e=>e.number===episode)||project().scripts[0];
  const stamp=()=>new Date().toISOString();
  const formatDate=s=>new Date(s).toLocaleString('zh-CN',{hour12:false});
  function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),5000);}
  function saveStatus(text){saveLabel=text;document.querySelectorAll('[data-save]').forEach(e=>e.textContent=text+' · 修订 '+project().revision);document.querySelectorAll('[data-script-save]').forEach(e=>e.textContent=text.startsWith('已保存')?'✓ 版本已保存':text);}
  function remember(){if(historyProject!==project().id){undo=[];redo=[];historyProject=project().id;}const value=JSON.stringify(C.cleanPayload(project()));if(undo.at(-1)!==value)undo.push(value);if(undo.length>30)undo.shift();redo=[];updateUndo();}
  function updateUndo(){const u=$('[data-action="undo"]'),r=$('[data-action="redo"]');if(u)u.disabled=!undo.length;if(r)r.disabled=!redo.length;}
  function markChanged(bible=false){if(bible)C.markBibleEdit(project());project().updatedAt=state.updatedAt=stamp();saveStatus('保存中');clearTimeout(saveTimer);saveTimer=setTimeout(save,350);updateRevisionLabels();}
  function updateRevisionLabels(){document.querySelectorAll('[data-revision-status]').forEach(e=>{const confirmed=project().revision===project().confirmedRevision;e.textContent=confirmed?'已确认':'待确认';e.classList.toggle('pending',!confirmed);});const b=$('[data-action="confirm-bible"]');if(b)b.innerHTML=project().confirmedRevision?'确认当前修订':'确认圣经';}
  async function save(){
    clearTimeout(saveTimer);const data=JSON.stringify(state),at=state.updatedAt;let localOK=true;try{localStorage.setItem(KEY,data);}catch{localOK=false;}
    if(!serverConnected||!diskSafe){saveStatus(localOK?(diskSafe?'已保存至浏览器':'仅保存至浏览器'):'保存失败');return;}
    saveQueue=saveQueue.catch(()=>{}).then(async()=>{try{const r=await fetch('/api/workspace',{method:'PUT',body:data,headers:{'Content-Type':'application/json','If-Match':diskTag||''}});if(!r.ok){const error=await r.json();if(r.status===409){diskSafe=false;localStorage.setItem(KEY+'-recovery',data);}throw new Error(error.error||'磁盘同步失败');}diskTag=r.headers.get('ETag');if(at===state.updatedAt)saveStatus('已保存');return true;}catch(e){saveStatus(localOK?'浏览器已保存 · 磁盘同步失败':'保存失败');toast(e.message||'磁盘同步未完成，请检查启动窗口，或导出 JSON 备份。');return false;}});return await saveQueue;
  }
  let sourceBinding='',sourcePolling=false;
  async function bindSource(){
    if(!StoryHost.source||!serverConnected||!diskSafe)return;
    const source=project(),number=episode,key=source.id+':'+number;
    if(sourceBinding===key)return;
    const r=await fetch('/api/platform/source-bind',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source_project_id:source.id,episode:number})});
    const receipt=await r.json();if(!r.ok)throw new Error(receipt.error||'故事助手连接失败');
    if(key!==project().id+':'+episode)return;
    sourceBinding=key;StoryHost.source(receipt);
  }
  async function refreshSource(){
    if(sourcePolling||!serverConnected||!diskSafe||busy||saveLabel!=='已保存'||document.visibilityState==='hidden')return;
    sourcePolling=true;
    try{
      const before=state.updatedAt,previous=project().id,r=await fetch('/api/workspace');
      if(!r.ok)return;
      const tag=r.headers.get('ETag'),value=await r.json();
      if(tag===diskTag||!value||before!==state.updatedAt||busy||saveLabel!=='已保存')return;
      // Never re-render over focused text or a modal with uncommitted input.
      if(document.querySelector('dialog[open]')||document.activeElement?.matches('input,textarea,[contenteditable="true"]'))return;
      const latest=C.cleanWorkspace(value);if(latest.projects.some(p=>p.id===previous))latest.activeId=previous;
      state=latest;diskTag=tag;undo=[];redo=[];historyProject=project().id;
      localStorage.setItem(KEY,JSON.stringify(state));route();toast('已同步助手或其他页面的修改');
    }catch{}finally{sourcePolling=false;}
  }
  setInterval(()=>{refreshSource();bindSource().catch(error=>toast(error.message));},3000);
  window.addEventListener('focus',refreshSource);
  function undoRedo(isRedo=false){const source=isRedo?redo:undo,target=isRedo?undo:redo,current=JSON.stringify(C.cleanPayload(project()));while(source.at(-1)===current)source.pop();if(!source.length){updateUndo();return;}target.push(current);Object.assign(project(),C.cleanPayload(JSON.parse(source.pop())));markChanged();render();}
  function route(){if(location.hash.replace(/^#\/?/,'').split('/')[0]==='version'&&module!=='version')versionId='current';const pieces=location.hash.replace(/^#\/?/,'').split('/');module=['bible','script','entity','version','export','projects','production','novel','characters','boards','directions','analysis'].includes(pieces[0])?pieces[0]:'bible';if(module==='projects'&&StoryHost.projects?.())return;if(module==='bible'){section=sections.some(([id])=>id===pieces[1])?pieces[1]:'core';if(pieces[1]==='characters')history.replaceState(null,'','#bible/core');}if(['script','boards'].includes(module)&&Number(pieces[1]))episode=Number(pieces[1]);if(module==='production')filmId=pieces[1]||project().productions[0]?.id;if(module==='novel')novelId=pieces[1]||project().novels[0]?.id;render();}
  function go(target){innerNavOpen=false;if(target==='version'&&module!=='version')versionId='current';if(location.hash!=='#'+target)history.pushState(null,'','#'+target);route();}
  function field(label,path,value,options={}){const {kind='textarea',size='',placeholder='',max=50000}=options,id='f-'+path.replaceAll('.','-');return `<div class="field"><label for="${id}">${label}</label>${kind==='input'?`<input id="${id}" data-bind="${path}" maxlength="${max}" value="${esc(value)}" placeholder="${esc(placeholder)}">`:`<textarea id="${id}" class="${size}" data-bind="${path}" maxlength="${max}" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`}</div>`;}
  function moduleLink([key,label,ico]){return `<a class="module-link ${module===key?'active':''}" href="#${key}${key==='bible'?'/'+section:key==='script'?'/'+episode:''}">${icon(ico)}${label}</a>`;}
  function header(){return `<header class="project-header"><div class="breadcrumb">${StoryHost.embedded?ib('返回创作首页','studio-home','back'):ib('返回项目空间','projects','back')}<span class="crumb">剧本工作台</span><strong translate="no">${module==='projects'?'我的项目':esc(project().name)}</strong><span class="badge">剧本创作</span></div><div class="header-actions">${StoryHost.source?button('同步最新','refresh-source','refresh'):''}${button('AI 创作流程','workflow','spark')}${button('项目设置','project-settings','settings')}${button('模型设置','model-settings','settings')}${button('制作准备','platform-open','camera')}</div></header>${module==='projects'?'':`<nav class="module-nav" aria-label="项目模块">${['bible','characters','boards','version','analysis'].includes(module)?`<button type="button" class="button inner-nav-toggle" data-action="toggle-inner-nav" aria-expanded="${innerNavOpen}">${icon('book')}目录</button>`:''}${modules.slice(0,5).map(moduleLink).join('')}<div class="module-tools" aria-label="管理工具">${modules.slice(5).map(moduleLink).join('')}</div></nav>${module==='script'?`<div class="script-module-tools">${SceneEditor.nav()}</div>`:''}${batchBanner()}`}`;}
  function panelHeading(title,right=''){return `<header class="panel-heading"><div><h1>${title}</h1><div class="save-state" data-save>${esc(saveLabel)} · 修订 ${project().revision}</div></div>${right}</header>`;}
  function bibleTree(){return `<nav class="section-tree bible-tree" aria-label="创作圣经章节"><div class="tree-title">${icon('book')}<div><strong>创作圣经</strong><div class="tree-status ${project().revision!==project().confirmedRevision?'pending':''}" data-revision-status>${project().revision===project().confirmedRevision?'已确认':'待确认'}</div></div></div>${sections.map(([key,label])=>`<button class="tree-button ${section===key?'active':''}" data-action="section" data-section="${key}"><span>${label}</span><span>›</span></button>`).join('')}</nav>`;}
  function bioSectionHeading(number,title,description){return `<header class="bio-section-heading"><span class="bio-section-number">${number}</span><div><h2>${title}</h2><p>${description}</p></div></header>`;}
  function characterFields(c,i){return `<section class="bio-section bio-identity">${bioSectionHeading('01','基本信息','先建立身份与性格，让人物容易识别。')}<div class="bio-basics">${field('姓名',`bible.characters.${i}.name`,c.name,{kind:'input',max:100})}${field('角色定位',`bible.characters.${i}.role`,c.role,{kind:'input',max:500})}<div class="field"><label for="bio-age-${i}">年龄</label><input id="bio-age-${i}" type="number" min="0" max="9999" value="${c.age??''}" data-bind="bible.characters.${i}.age"></div></div><div class="field bio-traits"><label for="bio-traits-${i}">性格标签</label><input id="bio-traits-${i}" data-character-traits="${c.id}" value="${esc((c.traits||[]).join('、'))}" maxlength="2000" placeholder="用逗号或顿号分隔，如：克制、执着、敏感"><div class="fusion-tags">${(c.traits||[]).map(t=>`<span>${esc(t)}</span>`).join('')}</div></div></section><section class="bio-section bio-story">${bioSectionHeading('02','完整小传','经历、关系与转变，构成这个人物的来路。')}${field('人物背景与完整小传',`bible.characters.${i}.background`,c.background||'',{size:'large',placeholder:'写下重要经历、核心动机、关系变化，以及故事中的成长过程。'})}</section><section class="bio-section bio-elements">${bioSectionHeading('03','人物驱动','明确想要什么、为何行动，以及如何改变。')}<div class="row">${field('目标',`bible.characters.${i}.goal`,c.goal)}${field('动机',`bible.characters.${i}.motivation`,c.motivation)}</div><div class="row">${field('缺陷',`bible.characters.${i}.flaw`,c.flaw)}${field('成长弧线',`bible.characters.${i}.arc`,c.arc)}</div>${field('人物关系',`bible.characters.${i}.relationships`,c.relationships)}</section>`;}
  function bibleForm(){const b=project().bible;
    if(section==='core')return field('一句话梗概','bible.core.logline',b.core.logline)+field('核心故事','bible.core.story',b.core.story,{size:'large'})+`<div class="row">${field('题材','bible.core.genre',b.core.genre,{kind:'input',max:200})}${field('叙事基调','bible.core.tone',b.core.tone,{kind:'input',max:1000})}</div>`+field('主题表达','bible.core.theme',b.core.theme);
    if(section==='world')return field('时代与背景','bible.world.era',b.world.era,{kind:'input',max:500})+field('主要地点（每行一个）','bible.world.locations',b.world.locations,{size:'large'})+field('世界规则（每行一条）','bible.world.rules',b.world.rules,{size:'tall'})+field('不可违反的事实（每行一条）','bible.world.facts',b.world.facts,{size:'tall'});
    if(section==='structure')return [['mainline','故事主线'],['opening','开端'],['development','发展'],['climax','高潮'],['ending','结局']].map(([key,label])=>field(label,'bible.structure.'+key,b.structure[key])).join('');
    return b.outlines.map((o,i)=>`<article class="record-card"><header class="record-top"><span class="episode-badge">EP${String(o.number).padStart(2,'0')}</span><input class="record-name" aria-label="第 ${o.number} 集标题" data-bind="bible.outlines.${i}.title" maxlength="200" value="${esc(o.title)}"><label class="duration">最短 <input type="number" min="5" max="600" aria-label="第 ${o.number} 集最短时长" data-bind="bible.outlines.${i}.durationMin" value="${o.durationMin??''}" placeholder="5"> 秒</label><label class="duration">最长 <input type="number" min="1" max="86400" aria-label="第 ${o.number} 集时长" data-bind="bible.outlines.${i}.duration" value="${o.duration??''}" placeholder="按剧情推进">秒</label></header>${[['goal','本集目标'],['conflict','核心冲突'],['turn','关键转折'],['hook','结尾钩子']].map(([key,label])=>field(label,`bible.outlines.${i}.${key}`,o[key])).join('')}</article>`).join('')+`<button class="add-row" data-action="add-outline">${icon('plus')}添加分集大纲</button>`;
  }
  function bibleView(){return `<div class="module-body bible-layout">${bibleTree()}<section class="editor-panel">${panelHeading(sections.find(([s])=>s===section)[1],button('生成完整设定','generate-bible','spark')+button('重新生成','regenerate','refresh'))}<div class="form-scroll"><div class="form-content">${bibleForm()}</div></div><footer class="editor-footer"><span class="footer-note">${icon('check')}<span>确认后的圣经将成为 AI 生成剧本的权威依据。后续修改不会自动覆盖现有剧本。</span></span><div class="footer-actions">${ib('撤销','undo','undo',undo.length?'':'disabled')}${ib('重做','redo','redo',redo.length?'':'disabled')}${button(project().confirmedRevision?'确认当前修订':'确认圣经','confirm-bible')}${button(project().confirmedRevision===project().revision?'生成剧本':'确认并生成剧本','confirm-generate','spark','primary')}</div></footer></section></div>`;}
  function scriptView(){return SceneEditor.view();}
  function empty(title,message,actions=''){return `<div class="empty">${icon('book')}<h3>${title}</h3><p>${message}</p>${actions}</div>`;}
  function entityView(){const list=project().entities.filter(e=>e.type===entityType&&(showIgnored||e.status!=='已忽略'));return `<div class="module-body"><div class="full-scroll"><div class="library-top"><div><p>项目资料</p><h1>${entityType}</h1></div><div class="library-tools">${button('从剧本提取','parse-entities','spark','small')}${button('同步人物设定','sync-entities','refresh','ghost small')}${button('新建','new-entity','plus')}</div></div><div class="entity-tabs">${['角色','场景','道具'].map(t=>`<button class="${t===entityType?'active':''}" data-action="entity-type" data-value="${t}">${t} ${project().entities.filter(e=>e.type===t&&e.status!=='已忽略').length}</button>`).join('')}</div><div class="entity-grid">${list.map(e=>`<article class="entity-card">${ib('删除 '+e.name,'delete-entity','trash',`data-id="${e.id}"`)}<div class="entity-top"><strong translate="no">${esc(e.name)}</strong><span class="pill ${e.status==='已确认'?'confirmed':e.status==='待确认'?'pending':''}">${e.status}</span></div><p translate="no">${esc(e.description)}</p><div class="entity-bottom">${button('编辑','edit-entity','','ghost small',`data-id="${e.id}"`)}${e.status==='待确认'?button('忽略','ignore-entity','','ghost small',`data-id="${e.id}"`)+button('确认资料','confirm-entity','','small',`data-id="${e.id}"`):e.status==='已忽略'?button('恢复资料','restore-entity','','small',`data-id="${e.id}"`):''}</div></article>`).join('')}</div>${!list.length?empty('暂无'+entityType,'添加资料，作为后续剧本与分镜制作的参考。'):''}<p style="margin-top:22px"><button class="quiet-link" data-action="toggle-ignored">${showIgnored?'隐藏已忽略资料':'显示已忽略资料'}</button></p></div></div>`;}
  function reading(scripts){return SceneEditor.documentHTML(scripts);}
  function versionView(){return SceneEditor.versions(project(),versionId,formatDate);}
  function exportView(){return `<div class="module-body"><div class="full-scroll"><div class="library-top"><div><p>统一项目 · 本地交付</p><h1>导出</h1></div></div><div class="export-grid"><section class="export-card"><header>${icon('file')}<strong>剧本正文</strong></header><div class="card-body"><p>保留分集、场景与对白结构。</p><div class="segmented">${[['txt','纯文本 TXT'],['fountain','Fountain']].map(([f,label])=>`<button class="segment ${format===f?'active':''}" data-action="format" data-value="${f}">${label}</button>`).join('')}</div><div class="card-actions">${button('导出全部剧本','export-fusion-script','download','primary')}</div></div></section><section class="export-card"><header>${icon('users')}<strong>人物小传</strong></header><div class="card-body"><p>导出姓名、定位、年龄、性格、完整小传及人物要素。</p>${button('导出人物小传','export-characters','download')}</div></section><section class="export-card"><header>${icon('camera')}<strong>AI 分镜表</strong></header><div class="card-body"><p>每行一个镜头，包含原场景、人物、时长、镜头计划和制作提示词。</p>${button('导出分镜 CSV','export-boards','download')}</div></section><section class="export-card"><header>${icon('download')}<strong>完整项目备份</strong></header><div class="card-body"><p>保存统一故事、人物、剧本、分镜与版本记录。</p>${button('导出 JSON 备份','backup','download')}${button('导入备份','import','upload')}</div></section></div></div></div>`;}
  function projectsView(){const list=state.projects.filter(p=>(p.name+p.bible.core.logline).includes(search));return `<div class="module-body"><div class="full-scroll"><div class="library-top"><div><p>个人空间 · 本地项目</p><h1>项目空间</h1></div><div class="library-tools">${button('导入','import','upload','ghost')}${button('新建项目','new-project','plus','primary')}</div></div><div class="field search"><label class="sr-only" for="search">搜索项目</label><input id="search" placeholder="搜索项目名称或故事梗概" value="${esc(search)}"></div><div class="project-grid">${list.map(p=>`<button class="project-card" data-action="open-project" data-id="${p.id}"><div class="project-cover">${icon('film')}</div><div class="project-card-info"><h2 translate="no">${esc(p.name)}</h2><p translate="no">${esc(p.bible.core.logline||'从一个故事想法开始。')}</p><small>${p.bible.outlines.length} 集 · ${p.bible.characters.length} 位人物 · ${esc(p.status)}</small></div></button>`).join('')}</div></div></div>`;}
  let bioId='';
  let innerNavOpen=false;
  function charactersView(){
    const p=project(),characters=p.bible.characters,c=characters.find(c=>c.id===bioId)||characters[0],i=characters.indexOf(c);if(c)bioId=c.id;
    return `<div class="module-body fusion-people"><section class="editor-panel">${panelHeading('人物小传',button('AI 生成人物小传','generate-characters','spark')+button('新增人物','fusion-add-character','plus'))}<div class="form-scroll"><div class="form-content">${c?`${characterFields(c,i)}<div class="bio-delete">${button('删除当前人物','remove-character','trash','ghost',`data-index="${i}"`)}</div>`:empty('先建立故事中的人物','填写故事想法后，为人物补全身份、经历和成长过程。',button('AI 生成人物小传','generate-characters','spark','primary'))}</div></div><footer class="editor-footer"><span class="footer-note">人物资料与故事设定共用，修改后需重新确认。</span>${button('查看故事设定','go-bible','book')}${button('确认并生成剧本','confirm-generate','spark','primary')}</footer></section><nav class="fusion-roster" aria-label="人物选择"><div class="fusion-roster-title"><strong>全部人物 · ${characters.length}</strong>${ib('新增人物','fusion-add-character','plus')}</div>${characters.map(x=>`<button class="fusion-person ${c?.id===x.id?'active':''}" data-action="select-bio" data-id="${x.id}" aria-pressed="${c?.id===x.id}"><span class="fusion-initial">${esc(x.name.slice(0,1)||'人')}</span><strong>${esc(x.name||'未命名')}</strong><small>${esc(x.role)}${x.age!=null?' · '+x.age+' 岁':''}</small></button>`).join('')}</nav></div>`;
  }
  function boardTimingNotice(p,b){
    const t=Fusion.timing(p,b),messages=[];
    if(t.ready)return '';
    if(!t.targetValid)return `<div class="notice fusion-timing-notice warning" role="status"><div>请先设置本集时长。</div>${button('设置时长','batch-outlines','clock','small')}</div>`;
    if(!t.aligned)messages.push(`当前 ${t.total} 秒，目标 ${Fusion.targetLabel(p,b.episode)} 秒`);
    if(t.unsupportedDurations.length)messages.push('第 '+t.unsupportedDurations.join('、')+' 镜时长需调整');
    if(t.unreviewed)messages.push(`${t.unreviewed} 镜对白待确认`);
    if(t.tooMany)messages.push('镜头偏多，建议调整节奏');
    if(t.rushed.length)messages.push(`第 ${t.rushed.join('、')} 镜对白偏长`);
    return `<div class="notice fusion-timing-notice warning" role="status"><div>${messages.map(esc).join('；')}。</div>${button('调整分镜','retime-boards','clock','small')}</div>`;
  }

  function boardsView(){
    const p=project(),available=p.scripts.filter(A.hasScriptContent);if(!p.scripts.some(e=>e.number===episode))episode=p.scripts[0]?.number||1;
    const e=p.scripts.find(e=>e.number===episode),b=p.storyboards.find(b=>b.episode===episode),bi=p.storyboards.indexOf(b),target=Fusion.targetDuration(p,episode),total=b?.shots.reduce((n,s)=>n+s.duration,0)||0,t=b?Fusion.timing(p,b):null,times=b?Fusion.timeline(b.shots):[];
    return `<div class="module-body fusion-board-layout"><nav class="section-tree" aria-label="分镜分集"><div class="tree-title"><strong>剧本分集</strong></div>${p.scripts.map(e=>`<button class="tree-button ${episode===e.number?'active':''}" data-action="board-episode" data-number="${e.number}"><span>第 ${e.number} 集<br><small>${esc(e.title)}</small></span><span>${p.storyboards.find(b=>b.episode===e.number)?.shots.length||0} 镜</span></button>`).join('')}</nav><div class="full-scroll fusion-board-main"><div class="library-top"><div><p>一张卡一个镜头 · 直接关联原场景与人物</p><h1>AI 分镜</h1></div><div class="library-tools">${button('生成本集分镜','generate-boards','spark','primary')}<details><summary>分镜设置</summary>${button('剧本版本与时长','event-open','clock')}${button('自定义分镜要求','custom-boards','edit')}</details>${b?button('按目标时长重排','retime-boards','clock'):''}${p.scripts.filter(A.hasScriptContent).length>1?button('生成多集分镜','generate-all-boards','spark'):''}${button('导出分镜 CSV','export-boards','download')}</div></div><div class="fusion-board-settings"><div class="field"><label for="fusion-style">视觉风格</label><input id="fusion-style" data-bind="visualStyle" value="${esc(p.visualStyle)}" maxlength="200"></div><div class="field"><label for="fusion-ratio">画幅</label><select id="fusion-ratio" data-bind="aspectRatio">${['9:16','16:9','1:1','4:3','3:4','21:9'].map(v=>`<option ${p.aspectRatio===v?'selected':''}>${v}</option>`).join('')}</select></div><div class="fusion-stats"><strong>${b?.shots.length||0}</strong> 个镜头 <span>·</span> 计划 ${total} 秒${target?' / 目标 '+Fusion.targetLabel(p,episode)+' 秒':''}${t?`<span class="fusion-timing-badge ${t.ready?'matched':'mismatch'}">${t.ready?'已就绪':'待调整'}</span>`:''}</div></div>${b?boardTimingNotice(p,b):''}${b&&Fusion.stale(p,b)?'<div class="notice warning">故事内容已更新，请检查分镜。</div>':''}${e&&e.basedOnRevision!==p.confirmedRevision&&A.hasScriptContent(e)?'<div class="notice subtle">故事设定已更新，请检查本集剧本。</div>':''}<div class="fusion-board-grid">${b?.shots.map((s,j)=>{const scene=e?.scenes.find(x=>x.id===s.sceneId);return `<article class="fusion-shot"><header><span class="fusion-shot-number">${String(s.number).padStart(2,'0')}</span><div><strong>${esc(s.heading)}</strong><small>EP${String(episode).padStart(2,'0')} · ${esc(scene?.heading||'原场景已移除')}</small><small class="fusion-shot-range">${times[j].start}–${times[j].end} 秒</small></div><label class="fusion-shot-time"><select aria-label="镜头 ${s.number} 时长" data-bind="storyboards.${bi}.shots.${j}.duration" data-shot-duration>${!Fusion.validDuration(s.duration)?`<option value="${s.duration}" selected disabled>${s.duration} 秒（需重排）</option>`:''}${Fusion.shotDurations.map(d=>`<option value="${d}" ${s.duration===d?'selected':''}>${d} 秒</option>`).join('')}</select></label></header><div class="fusion-shot-content"><div class="fusion-tags">${s.characterIds.map(id=>`<span>${esc(p.bible.characters.find(c=>c.id===id)?.name||'人物已移除')}</span>`).join('')||'<span>空镜</span>'}</div><p class="fusion-source"><span class="fusion-source-label">原文参考</span>${esc(s.script)}</p>${field('实际对白 / 旁白',`storyboards.${bi}.shots.${j}.spokenText`,s.spokenText??'',{size:'compact',max:10000,placeholder:s.spokenText==null?'旧版尚未核对；填写本镜实际台词，无发声可留空。':'本镜实际说出的台词，不含角色名和括注；无发声留空。'})}<p class="fusion-speech-note ${s.spokenText!=null&&Fusion.speechUnits(s.spokenText)>Fusion.spokenCapacity(s.duration)?'over-budget':''}">${s.spokenText==null?'旧版对白未核对':s.spokenText.trim()?'对白估算 '+Fusion.speechSeconds(s.spokenText)+' 秒 / 本镜 '+s.duration+' 秒':'本镜无对白 / 旁白'}</p>${field('镜头计划',`storyboards.${bi}.shots.${j}.notes`,s.notes,{max:10000})}<details><summary>画面与视频提示词</summary>${field('画面提示词',`storyboards.${bi}.shots.${j}.imagePrompt`,s.imagePrompt,{max:10000})}${field('视频提示词',`storyboards.${bi}.shots.${j}.videoPrompt`,s.videoPrompt,{max:10000})}</details><div class="fusion-shot-actions">${button('生成详细视频方案','generate-video-plan','spark','small',`data-id="${s.id}" data-number="${episode}"`)}${button('查看原场景','board-source','file','ghost small',`data-scene="${s.sceneId}" data-number="${episode}"`)}</div></div></article>`;}).join('')||''}</div>${!b?empty('本集分镜','生成后可在这里预览、编辑和导出镜头。'):''}</div></div>`;
  }

  function productionView(){const p=project(),f=p.productions.find(f=>f.id===filmId),i=p.productions.indexOf(f);return `<div class="module-body"><div class="full-scroll"><div class="library-top"><div><p>本地影视项目 · ${f?.shots.length||0} 个场景</p><h1 translate="no">${esc(f?.name||'影视制作')}</h1></div><div class="library-tools">${button('生成全部分镜','generate-production','spark')}${button('导出分镜','export-production','download')}${button('返回剧本','go-script','back','ghost')}</div></div><div class="notice subtle">创作模型根据场景和主体资料生成逐镜拍摄计划。预览采用后保存到制作卡；图片和视频需使用相应生成服务。</div><div class="production-grid">${f?.shots.map((s,j)=>`<article class="shot-card"><div class="shot-frame">${icon('camera')}<span>EP${String(s.episode).padStart(2,'0')} · ${String(j+1).padStart(2,'0')}</span></div><div class="shot-body"><h3 translate="no">${esc(s.heading)}</h3><select aria-label="场景 ${j+1} 制作状态" data-bind="productions.${i}.shots.${j}.status">${['待制作','制作中','已完成'].map(status=>`<option ${s.status===status?'selected':''}>${status}</option>`).join('')}</select><p translate="no">${esc(s.description)}</p><textarea aria-label="场景 ${j+1} 镜头计划" data-bind="productions.${i}.shots.${j}.notes" placeholder="景别、机位、镜头运动、拍摄备注…" maxlength="10000">${esc(s.notes)}</textarea>${button('生成本场分镜','generate-shot','spark','small',`data-id="${s.id}"`)}</div></article>`).join('')||''}</div></div></div>`;}
  function novelView(){const n=project().novels.find(n=>n.id===novelId),i=project().novels.indexOf(n);return `<div class="module-body"><div class="full-scroll"><div class="library-top"><div><p>${esc(n?.style||'本地小说稿')}</p><h1 translate="no">${esc(n?.name||'小说')}</h1></div>${button('返回导出','go-export','back','ghost')}</div>${n?`<textarea class="novel-editor" aria-label="小说正文" data-bind="novels.${i}.content" maxlength="50000">${esc(n.content)}</textarea><div class="card-actions">${button('导出小说','export-novel','download')}</div>`:''}</div></div>`;}
  function render(){SceneEditor.capture();document.documentElement.lang=state.locale==='en'?'en':'zh-CN';app.innerHTML=`<main class="workspace ${innerNavOpen?'inner-nav-open':''}">${header()}${({directions:directionsView,bible:bibleView,characters:charactersView,boards:boardsView,analysis:()=>getAnalysis().view(),script:scriptView,entity:entityView,version:versionView,export:exportView,projects:projectsView,production:productionView,novel:novelView}[module])()}</main>`;document.title=project().name+' · 剧本创作';translateUI(app);SceneEditor.mount();updateUndo();saveStatus(saveLabel);}
  function show(title,body,footer=''){if(dialog.open)dialog.close();dialog.innerHTML=`<div class="dialog-head"><h2 id="dialog-title">${title}</h2>${ib('关闭','close-dialog','close')}</div><div class="dialog-body">${body}</div>${footer?`<div class="dialog-foot">${footer}</div>`:''}`;dialog.showModal();translateUI(dialog);}
  function close(){if(batchActive){batchDialogClosed=true;aiController?.abort();dialog.close();return;}if(busy){aiController?.abort();busy=false;}dialog.close();}
  function confirm(title,message,action,extra='',label='确认'){show(title,`<p>${message}</p>`,button('取消','close-dialog')+button(label,action,'','primary',extra));}
  function modelSettings(){
    if(model.managed){
      show('创作模型',`<div id="model-feedback" role="status" class="notice ${model.configured?'':'warning'}">${esc(model.lastTest?.ok?'模型连接正常':model.configured?'已接入平台创作模型':'平台创作模型尚未配置，请联系管理员')}</div><p>AI 短剧与智能创作共用同一套模型配置。</p><p>当前模型：<strong>${esc(model.model||'未配置')}</strong></p><p>模型配置由管理员统一管理，无需在这里填写密钥。</p><div class="backup-buttons">${button('导出工作区备份','backup','download')}${button('导入备份','import','upload')}${localStorage.getItem(KEY+'-recovery')?button('导出未同步副本','backup-recovery','download'):''}</div>`,button('关闭','close-dialog')+button('测试连接','test-model','check','primary',model.configured?'':'disabled'));
      return;
    }
    const status=!serverConnected?'请先使用启动.bat 打开本地服务':model.lastTest?.ok?'DeepSeek 已连接 · '+model.model:model.configured?'密钥已保存，建议测试连接':'填写 API Key，开始使用 DeepSeek';
    show('DeepSeek 模型设置',`<div id="model-feedback" role="status" class="notice ${model.lastTest?.ok?'':'warning'}">${esc(status)}</div>
      <p>服务地址：<code>https://api.deepseek.com</code></p>
      <div class="field"><label for="deepseek-key">API Key ${model.hasKey?'（已保存；留空保留原密钥）':''}</label><input id="deepseek-key" type="password" autocomplete="off" spellcheck="false" maxlength="512" placeholder="${model.hasKey?'已保存，不回显密钥':'粘贴你的 DeepSeek API Key'}"></div>
      <div class="field"><label for="deepseek-model">模型名称</label><input id="deepseek-model" list="deepseek-models" value="${esc(model.model||'deepseek-flash')}" maxlength="90"><datalist id="deepseek-models"><option value="deepseek-flash"><option value="deepseek-v4-pro"></datalist></div>
      <div class="row"><div class="field"><label for="deepseek-tokens">最大输出长度（tokens）</label><input id="deepseek-tokens" type="number" min="1024" max="64000" value="${model.maxTokens||16000}"></div><div class="field"><label for="deepseek-timeout">等待时间（秒）</label><input id="deepseek-timeout" type="number" min="30" max="600" value="${model.timeoutSeconds||240}"></div></div>
      <p>保存后立即生效。密钥保存在本机独立配置文件中，不进入项目、浏览器存储或导出备份。连接测试会发送一次简短请求；创作按 DeepSeek 账户用量计费。</p>
      <div class="backup-buttons">${button('导出工作区备份','backup','download')}${button('导入备份','import','upload')}${localStorage.getItem(KEY+'-recovery')?button('导出未同步副本','backup-recovery','download'):''}${model.hasKey?button('清除密钥','clear-model-key','','ghost'):''}</div>`,button('关闭','close-dialog')+button('保存设置','save-model','','',serverConnected?'':'disabled')+button('保存并测试连接','test-model','check','primary',serverConnected?'':'disabled'));
  }
  async function saveModel(test=false,clear=false){
    const feedback=$('#model-feedback'),controls=[...dialog.querySelectorAll('[data-action="save-model"],[data-action="test-model"],[data-action="clear-model-key"]')];
    const payload=model.managed?null:{model:$('#deepseek-model').value.trim(),apiKey:$('#deepseek-key').value,maxTokens:Number($('#deepseek-tokens').value),timeoutSeconds:Number($('#deepseek-timeout').value),clearKey:clear};
    controls.forEach(el=>el.disabled=true);feedback.textContent=test?'正在连接创作模型…':'正在保存…';
    try{
      if(!model.managed){
      const r=await fetch('/api/ai/config',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),data=await r.json();if(!r.ok)throw new Error(data.error);
      model=data;if($('#deepseek-key'))$('#deepseek-key').value='';
      }
      if(test){const r=await fetch('/api/ai/test',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}),result=await r.json();if(!r.ok)throw new Error(result.error);model=result;feedback.textContent=result.message+' 用时 '+(result.latencyMs/1000).toFixed(1)+' 秒。';}
      else feedback.textContent=clear?'密钥已清除。':'设置已保存，立即生效。';
      feedback.classList.remove('warning');
    }catch(e){feedback.textContent=e.message;feedback.classList.add('warning');await getStatus();}finally{controls.forEach(el=>el.disabled=false);}
  }
  let batchActive=false,batchDialogClosed=false,batchKind='scripts';
  const batchLabel=kind=>kind==='scripts'?'剧本':'AI 分镜';
  function batchRows(run){return `<ol class="batch-episodes">${run.entries.map(e=>`<li class="batch-entry ${e.status}"><div><strong>第 ${e.number} 集 · ${esc(e.title)}</strong><small>${e.duration==null?'按剧情推进':e.duration+' 秒'}${e.reason?' · '+esc(e.reason):''}</small>${e.error?`<p>${esc(e.error)}</p>`:''}</div><span>${({pending:'等待生成',running:batchActive?'正在生成':'等待继续',done:'已生成并保存',skipped:'保留已有',failed:'生成失败'})[e.status]}</span></li>`).join('')}</ol>`;}
  function batchBanner(){
    const run=project().batchRun;if(!run||!['script','boards'].includes(module))return '';
    const c=SceneBatch.counts(run);
    return `<div class="batch-banner"><span><strong>全部${batchLabel(run.kind)}</strong> · 已生成 ${c.done} 集 · 保留 ${c.skipped} 集${c.remaining?' · 待完成 '+c.remaining+' 集':' · 全部完成'}</span>${button(c.remaining?'继续未完成集数':'查看生成记录',c.remaining?'batch-resume':'batch-report',c.remaining?'spark':'clock','small')}</div>`;
  }
  function batchPrepare(kind){
    if(busy){toast('已有生成任务正在进行');return;}
    if(!model.configured){modelSettings();return;}
    if(kind==='boards'){const pending=project().scripts.find(e=>A.hasScriptContent(e)&&!EventPlan.status(project(),e.number).ready);if(pending){EventPlanUI.open(pending.number);return;}}
    batchKind=kind;
    let entries;try{entries=SceneBatch.plan(project(),kind,'missing');}catch(error){show('暂时不能生成全部'+batchLabel(kind),`<p class="error">${esc(error.message)}</p>`,button('关闭','close-dialog')+button(kind==='boards'?'一键生成全部剧本':'查看分集大纲',kind==='boards'?'generate-all-scripts':'batch-outlines','book','primary'));return;}
    const unconfirmed=!project().confirmedBible||project().confirmedRevision!==project().revision;
    show('一键生成全部'+batchLabel(kind),`<p>按分集大纲顺序处理，共 ${entries.length} 集。每完成一集立即写入并保存，无需逐集采用。</p><div class="field"><label for="batch-mode">生成范围</label><select id="batch-mode"><option value="missing">${kind==='scripts'?'补齐缺失剧本（保留已有正文）':'补齐缺失或需复核的分镜'}</option><option value="all">重新生成全部（替换已有内容）</option></select></div><div id="batch-plan">${batchPlanHTML(entries)}</div><div class="field"><label for="batch-instruction">整批创作要求（选填）</label><textarea id="batch-instruction" maxlength="4000" placeholder="这段要求会应用于每一集。"></textarea></div><div class="notice">开始前保存整批快照。失败或停止时保留已完成集数，可继续未完成部分。${unconfirmed?' 开始时将确认当前故事设定。':''}生成期间请保持页面打开。</div>`,button('取消','close-dialog')+button(unconfirmed?'确认设定并开始':'开始生成全部','batch-start','spark','primary'));
  }
  function batchPlanHTML(entries){const todo=entries.filter(e=>e.status!=='skipped').length;return `<p class="batch-plan-count">将生成 ${todo} 集，保留 ${entries.length-todo} 集。</p>${batchRows({entries})}`;}
  function batchProgress(run){
    if(batchDialogClosed)return;
    const c=SceneBatch.counts(run),current=run.entries.find(e=>e.status==='running');
    show('正在生成全部'+batchLabel(run.kind),`<p>${current?'正在生成第 '+current.number+' 集 · '+esc(current.title):'正在保存进度'}</p><progress class="batch-progress" max="${c.total}" value="${c.done+c.skipped}"></progress><p>已生成并保存 ${c.done} 集 · 保留 ${c.skipped} 集 · 剩余 ${c.remaining} 集</p>${batchRows(run)}<div class="generation-progress" data-generation-progress aria-live="polite"></div><p>停止会取消当前请求，之前完成的集数已保存。关闭或刷新后可继续未完成集数。</p>`,button('停止生成','batch-stop'));
  }
  function batchReport(message=''){
    const run=project().batchRun;if(!run)return;const c=SceneBatch.counts(run);
    show(c.remaining?'批量生成已停止':'全部'+batchLabel(run.kind)+'已完成',`${message?`<p class="error">${esc(message)}</p>`:''}<p>已生成并保存 ${c.done} 集 · 保留 ${c.skipped} 集 · 待完成 ${c.remaining} 集</p>${batchRows(run)}`,button('关闭','close-dialog')+(c.remaining?button('继续未完成集数','batch-resume','spark','primary'):'')+button(run.kind==='scripts'?'查看剧本':'查看 AI 分镜',run.kind==='scripts'?'go-script':'go-boards','file'));
  }
  async function startBatch(resume=false){
    if(busy)return;
    if(!model.configured){modelSettings();return;}
    let initial=clone(project()),run;
    if(resume){run=initial.batchRun;SceneBatch.checkResume(initial,run);}
    else{
      const mode=$('#batch-mode').value,instruction=$('#batch-instruction').value;
      if(!initial.confirmedBible||initial.revision!==initial.confirmedRevision)C.confirmBible(initial);
      A.syncEpisodes(initial);
      run=SceneBatch.create(initial,batchKind,mode,instruction);
      if(!SceneBatch.counts(run).remaining){toast('没有需要补齐的内容；如需改写，请选择重新生成全部。');return;}
    }
    if(!serverConnected||!diskSafe)throw new Error('本地保存尚未就绪，请导出未同步内容并刷新后再开始批量生成');
    const projectId=project().id;let expectedAt=project().updatedAt;
    remember();busy=true;batchActive=true;batchDialogClosed=false;
    const controller=new AbortController();aiController=controller;
    try{
      await SceneBatch.execute(initial,run,{
        signal:controller.signal,request:(job,p,signal)=>A.request(job,p,signal,progress=>{if(aiController===controller&&!signal.aborted&&!batchDialogClosed)generationProgress(progress);}),onProgress:batchProgress,
        checkpoint:async candidate=>{
          if(project().id!==projectId||project().updatedAt!==expectedAt)throw new Error('项目已在生成期间被修改，任务停止以保护编辑内容');
          Object.assign(project(),candidate);markChanged();expectedAt=project().updatedAt;
          if(!await save())throw new Error('任务已停止：本地文件保存未成功。已完成内容保留在当前浏览器，请导出备份并处理保存冲突后继续');
          return clone(project());
        }
      });
      busy=false;batchActive=false;render();
      if(!batchDialogClosed)batchReport();else toast('批量任务进度已保留，可通过页面上方继续查看。');
    }catch(error){
      busy=false;batchActive=false;render();
      if(!batchDialogClosed){if(project().batchRun)batchReport(error.message);else show('批量任务未开始',`<p class="error">${esc(error.message)}</p>`,button('关闭','close-dialog'));}
      else toast(error.message);
    }
  }

  function workflow(){
    show('剧本与分镜',`<div class="workflow-steps">
      <div><strong>写剧本</strong><p>从故事设定生成分集正文，也可以直接在剧本页编写。</p>${button('编辑剧本','go-script','edit','primary')}${button('故事设定','go-bible','book')}</div>
      <div><strong>生成 AI 分镜</strong><p>选定本集剧本与时长范围后，预览镜头并导出分镜表。</p>${button('打开 AI 分镜','go-boards','camera')}</div></div>`,button('关闭','close-dialog'));
  }
  function settings(){show('项目设置',`<div class="field"><label for="project-name">项目名称</label><input id="project-name" class="input" value="${esc(project().name)}" maxlength="200"></div><div class="field"><label for="project-audience">目标受众</label><textarea id="project-audience" class="input" maxlength="2000">${esc(project().audienceProfile||'普通成年观众')}</textarea><p>每次生成都会参考该受众，并检查认知风险、受众适配与相关声音安排。</p></div><div class="option-label">项目状态</div><div class="segmented">${['进行中','已暂停','已完成'].map(s=>`<button class="segment ${s===project().status?'active':''}" data-action="choose-status" data-value="${s}">${s}</button>`).join('')}</div><div class="field"><label for="project-space">默认空间</label><select id="project-space"><option>个人空间</option></select></div><p>设置保存在当前本地项目中。</p>`,button('取消','close-dialog')+button('保存','save-settings','','primary'));}
  function entityDialog(entity=null){show(entity?'编辑资料':'新建资料',`<div class="field"><label for="entity-name">名称</label><input class="input" id="entity-name" maxlength="100" value="${esc(entity?.name||'')}"></div><div class="field"><label for="entity-type">类型</label><select id="entity-type">${['角色','场景','道具'].map(t=>`<option ${t===(entity?.type||entityType)?'selected':''}>${t}</option>`).join('')}</select></div><div class="field"><label for="entity-description">资料描述</label><textarea class="large" id="entity-description" maxlength="10000">${esc(entity?.description||'')}</textarea></div>`,button('取消','close-dialog')+button('保存资料','save-entity','','primary',`data-id="${entity?.id||''}"`));}
  function snapshotDialog(){show('创建快照',`<p>保存当前创作圣经、剧本、主体资料及本地制作项目。后续编辑不会改变快照。</p><div class="field"><label for="snapshot-name">版本名称</label><input class="input" id="snapshot-name" maxlength="200" value="修订 ${project().revision} · ${new Date().toLocaleDateString('zh-CN')}"></div><div class="field"><label for="snapshot-note">备注（选填）</label><textarea id="snapshot-note" maxlength="1000" placeholder="记录这个版本的调整和用途。"></textarea></div>`,button('取消','close-dialog')+button('创建快照','create-snapshot','plus','primary'));}
  async function saveFile(name,content){
    if(serverConnected){const r=await fetch('/api/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,content})});const data=await r.json();if(!r.ok)throw new Error(data.error||'导出失败');show('导出完成',`<div class="notice">文件已保存到 E 盘</div><p style="word-break:break-all" translate="no">${esc(data.path)}</p>`,button('完成','close-dialog','','primary'));}
    else{const url=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('请选择 E 盘作为下载保存位置');}
  }
  function openEpisodeOutline(number){
    if(!project().bible.outlines.some(o=>o.number===number)){remember();A.ensureOutline(project(),number);markChanged(true);}
    close();go('bible/outlines');
    const index=project().bible.outlines.findIndex(o=>o.number===number),field=$('#f-bible-outlines-'+index+'-goal');field?.scrollIntoView({block:'center'});field?.focus();
    toast('请填写本集大纲，或点击“重新生成”让创作模型补全；完成后确认并生成剧本。');
  }
  async function confirmAndGenerate(number){
    if(!number&&project().bible.outlines.length===1)number=project().bible.outlines[0].number;
    if(!number){batchPrepare('scripts');return;}
    const p=project(),outlines=number?p.bible.outlines.filter(o=>o.number===number):p.bible.outlines;
    if(!outlines.length){openEpisodeOutline(number||1);return;}
    const incomplete=outlines.find(o=>['goal','conflict','turn','hook'].some(k=>!o[k].trim()));
    if(incomplete){openEpisodeOutline(incomplete.number);return;}
    if(!p.confirmedBible||p.confirmedRevision!==p.revision){remember();C.confirmBible(p);A.syncEpisodes(p);markChanged();if(!await save())return;}
    close();episode=number;return aiPrepare('script',{episode:number},true);
  }
  let directionState={projectId:'',phase:'idle',error:'',progress:null,saved:true};
  function directionBrief(){const p=project(),set=p.storyDirections;return {instruction:set?.instruction||p.bible.core.logline,episodeCount:set?.episodeCount||p.bible.outlines.length||1,duration:set?set.duration:p.bible.outlines[0]?.duration??null,minSeconds:set?set.minSeconds:p.bible.outlines[0]?.durationMin};}
  function directionsView(){
    const p=project(),set=p.storyDirections,brief=directionBrief(),status=directionState.projectId===p.id?directionState:{phase:'idle',saved:true},generating=status.phase==='generating',names=['一','二','三'];
    const cards=set?.candidates.map((c,i)=>`<article class="direction-card ${set.selectedId===c.id?'chosen':''}"><header><div class="direction-number">方向${names[i]}${set.selectedId===c.id?'<span>已采用</span>':''}</div><h3>${esc(c.title)}</h3><div class="direction-tags"><span>${esc(c.genre)}</span><span>${esc(c.tone)}</span></div><p>${esc(c.angle)}</p><details><summary>补充创作要求</summary><textarea aria-label="方向${names[i]}补充要求" data-direction-note maxlength="4000"></textarea></details>${button('用方向'+names[i]+'生成设定','choose-direction','spark','primary',`data-id="${c.id}" ${generating?'disabled':''}`)}</header><div class="direction-content"><p class="direction-logline">${esc(c.logline)}</p><div class="direction-copy"><h4>故事走向</h4><p>${esc(c.story)}</p></div><details><summary>人物、冲突与结局</summary>${[['characters','人物与关系'],['conflict','核心冲突'],['twist','关键转折'],['ending','结局']].map(([k,l])=>`<div class="direction-copy"><h4>${l}</h4><p>${esc(c[k])}</p></div>`).join('')}</details><details><summary>阅读开场试写</summary><pre class="direction-sample">${esc(c.openingScene)}</pre></details></div></article>`).join('');
    const pending=names.map((name,i)=>`<article class="direction-card direction-pending"><span class="direction-number">方向${name}</span><h3>${['寻找独特的叙事视角','构思不同的人物关系','铺设意想不到的转折'][i]}</h3><div class="direction-placeholder" aria-hidden="true"><i></i><i></i><i></i><i></i></div><p>${generating?'三个方案正在一起生成，完成后在这里比较选择。':'生成后，这里将展示故事走向、人物与开场试写。'}</p></article>`).join('');
    return `<div class="module-body directions-workspace"><div class="directions-scroll"><header class="directions-heading"><div><p class="platform-kicker">故事起点 · 01</p><h1>${generating?'正在构思三个故事方向':'选择一个你想继续讲的故事'}</h1><p>同一个想法，三种不同的展开。选定后，再完善人物与分集剧本。</p></div><div class="directions-actions">${generating?button('取消生成','cancel-directions'):button(set?'重新生成三个方向':status.phase==='failed'?'重试生成':'生成三个故事方向','new-directions','spark',set?'':'primary')}${button('查看故事设定','go-bible','book','ghost')}</div></header><section class="direction-brief" aria-label="本次创作要求"><div class="direction-budget"><span>${brief.episodeCount} 集</span><span>${brief.duration===null?'按剧情推进':'每集 '+EventPlan.rangeLabel(brief.minSeconds??brief.duration,brief.duration)+' 秒'}</span><span>${esc(p.aspectRatio)} ${({'9:16':'手机竖屏','16:9':'标准横屏','1:1':'方形画面','4:3':'经典横屏','3:4':'经典竖屏','21:9':'宽银幕'}[p.aspectRatio]||'')}</span></div><p>${esc(brief.instruction||'请先在首页填写一个故事想法。')}</p></section>${generating?`<div class="direction-running" role="status"><span class="spinner"></span><div><strong>创作模型正在创作</strong><div data-generation-progress aria-live="polite"><p>${esc(status.progress?.message||'正在组织三个不同方向的故事，请保持页面打开。')}</p></div></div></div>`:status.phase==='failed'?`<div class="notice warning direction-error" role="alert"><strong>本次生成未完成</strong><p>${esc(status.error)}</p><p>故事想法与参数已保留，可以直接重试。</p></div>`:status.phase==='cancelled'?'<div class="notice subtle" role="status">已取消生成，故事想法已保留。点击上方按钮可重新开始。</div>':''}${status.saved===false?'<div class="notice warning">方向已保留在当前浏览器，但磁盘同步未完成。请先导出备份并解决保存冲突。</div>':''}<div class="direction-grid" aria-label="三个故事方向" aria-busy="${generating}">${cards||pending}</div><p class="directions-footnote">方向方案包含故事走向和开场试写；完整分集正文将在确认设定后生成。</p></div></div>`;
  }
  function directionCompare(){if(dialog.open)close();go('directions');}
  async function startDirections(){
    if(busy){toast('已有生成任务正在进行');return;}
    const original=clone(project()),brief=directionBrief(),job={task:'directions',projectId:original.id,...brief},at=original.updatedAt;
    directionState={projectId:original.id,phase:'generating',error:'',progress:null,saved:true};
    if(dialog.open)close();busy=true;const controller=new AbortController();aiController=controller;go('directions');
    try{
      if(!serverConnected||!diskSafe)throw new Error('项目尚未安全同步，请恢复连接或解决保存冲突后再试。');
      if(!model.configured)throw new Error(model.managed?'平台创作模型尚未配置，请联系管理员后重试。':'请先在右上方模型设置中配置 DeepSeek，再回来重试。');
      if(!brief.instruction?.trim())throw new Error('请先从创作首页填写故事想法，或在故事核心中补充一句话梗概。');
      if(original.storyDirections&&original.snapshots.length>=50)throw new Error('当前版本快照已达上限，请先导出备份并整理版本。');
      const result=await A.request(job,original,controller.signal,progress=>{if(aiController!==controller||controller.signal.aborted)return;directionState.progress=progress;if(module==='directions'&&project().id===original.id)generationProgress(progress);});
      if(controller.signal.aborted)throw new DOMException('Cancelled','AbortError');
      if(project().id!==original.id||project().updatedAt!==at)throw new Error('项目内容已变化，已阻止覆盖，请根据最新内容重新生成。');
      const candidate=A.apply(original,job,result.data);remember();Object.assign(project(),candidate);markChanged();const saved=await save();directionState={projectId:original.id,phase:'ready',error:'',progress:null,saved:!!saved};
    }catch(error){directionState={projectId:original.id,phase:controller.signal.aborted||error.name==='AbortError'?'cancelled':'failed',error:error.message||'生成连接中断，请重试。',progress:null,saved:true};}
    finally{if(aiController===controller){busy=false;aiController=null;}if(module==='directions'&&project().id===original.id)render();}
  }
  function chooseDirection(el){
    const id=el.dataset.id,instruction=el.closest('.direction-card')?.querySelector('[data-direction-note]')?.value||'';
    const set=project().storyDirections;if(!set)throw new Error('请先生成故事方向');
    return aiPrepare('bible',{directionSetId:set.id,directionId:id,episodeCount:set.episodeCount,duration:set.duration,minSeconds:set.minSeconds,instruction},true);
  }
  function aiPrepare(task,extra={},startNow=false){
    if(['all-scripts','all-boards'].includes(task)){batchPrepare(task==='all-scripts'?'scripts':'boards');return;}
    if(busy){toast('已有生成任务正在进行');return;}
    if(!model.configured){modelSettings();return;}
    if(['script','all-scripts'].includes(task)&&(!project().confirmedBible||project().confirmedRevision!==project().revision)){confirm('确认设定后生成剧本','将当前创作圣经确认为生成依据，然后进入剧本生成。','confirm-generate',task==='script'?`data-number="${extra.episode||episode}"`:'','确认并生成');return;}
    if(['novel','parse'].includes(task)&&!project().scripts.some(e=>e.scenes.length))throw new Error('请先编写剧本');
    if(['script','all-scripts'].includes(task)){const incomplete=project().confirmedBible.outlines.find(o=>['goal','conflict','turn','hook'].some(k=>!o[k].trim()));if(incomplete){openEpisodeOutline(incomplete.number);return;}if(!project().confirmedBible.outlines.length){openEpisodeOutline(1);return;}}
    if(task==='all-scripts'&&project().confirmedBible.outlines.length>20)throw new Error('连续生成最多20集，更多集数请逐集生成');
    if(task==='boards'&&!EventPlan.status(project(),extra.episode||episode).ready){EventPlanUI.open(extra.episode||episode);return;}
    if(['boards','all-boards'].includes(task)){const targets=task==='boards'?[extra.episode||episode]:project().scripts.filter(A.hasScriptContent).map(e=>e.number);if(!targets.length)throw new Error('请先生成剧本正文');if(targets.length>20)throw new Error('一次最多生成 20 集分镜');for(const n of targets)Fusion.context(project(),n);}
    if(task==='video-plan'){extra.episode=extra.episode||episode;extra.shotKey=Fusion.videoKey(project(),extra.episode,extra.shotId);Fusion.videoContext(project(),{task,...extra});}
    const film=project().productions.find(f=>f.id===filmId);
    if(task==='production'&&!film?.shots.length)throw new Error('请先从剧本创建影视项目');
    aiJob={task,section,episode,projectId:project().id,style:novelStyle,productionId:filmId,...extra};aiResult=null;
    if(startNow)return runAI(false,true);
    if(task==='directions'){void startDirections();return;}
    if(task==='video-plan'){
      const {shot}=Fusion.videoContext(project(),aiJob);
      show('详细视频方案 · 第 '+shot.number+' 镜',`<p>${esc(shot.heading)} · ${shot.duration} 秒</p><div class="notice">补全人物与环境、首尾帧、动作与运镜、光线质感、声音、负面约束及前后衔接。保留本镜动作、时长与实际对白，先预览，再替换本镜视频提示词。</div><div class="field"><label for="ai-instruction">画面细化要求（选填）</label><textarea id="ai-instruction" maxlength="4000" placeholder="例如：突出人物眼神，增加环境层次，沿用现有服装与镜头节奏。"></textarea></div><p>采用前会保存快照，可随时在版本管理中恢复。</p>`,button('取消','close-dialog')+button('生成详细方案','run-ai','spark','primary'));
      return;
    }
    const missing=project().scripts.filter(e=>!project().bible.outlines.some(o=>o.number===e.number));
    const titles={section:'重新生成 · '+((extra.section||section)==='characters'?'人物小传':sections.find(([s])=>s===(extra.section||section))[1]),boards:extra.retime?'按目标时长重排分镜':'生成本集 AI 分镜','all-boards':'连续生成全部 AI 分镜',bible:'从想法生成完整设定',script:'生成第 '+episode+' 集',novel:'改编为小说',parse:'提取角色、场景与道具',production:'生成拍摄分镜', 'all-scripts':'连续生成全部分集'};
    show(titles[task],`${['script','all-scripts'].includes(task)&&missing.length?`<div class="notice warning">第 ${missing.map(e=>e.number).join('、')} 集尚无大纲，不在本次生成范围内。可在对应空集内补充大纲。</div>`:''}<p>模型：${esc(model.model)}</p>${['script','boards'].includes(task)?`<div class="field"><label for="ai-episode">生成哪一集</label><select id="ai-episode">${project().confirmedBible.outlines.map(o=>`<option value="${o.number}" ${o.number===episode?'selected':''}>第 ${o.number} 集 · ${esc(o.title)}</option>`).join('')}</select></div>`:''}${task==='bible'?`<div class="row"><div class="field"><label for="ai-episodes">分集数量（1–20）</label><input id="ai-episodes" type="number" min="1" max="20" value="${Math.min(20,project().bible.outlines.length||1)}"></div><div class="field"><label for="ai-duration">每集时长（秒，可选）</label><input id="ai-duration" type="number" min="1" max="86400" value="${project().bible.outlines[0]?.duration??''}" placeholder="按剧情推进"></div></div>`:''}<div class="field"><label for="ai-instruction">${task==='bible'?'故事想法与创作要求':'补充要求（选填）'}</label><textarea id="ai-instruction" maxlength="4000" placeholder="描述故事想法、创作方向或需要保留的内容。">${task==='bible'?esc(project().bible.core.logline):extra.retime?esc('按本集目标 '+Fusion.targetLabel(project(),episode)+' 秒重排。逐项保留已确认拍摄版本中的事件和对白，调整镜头分配及提示词。禁止擅自删改；无法容纳时返回事件与时长确认。'):''}</textarea></div><div class="notice">结果先预览，采用后保存。${['all-scripts','all-boards'].includes(task)?'将按集连续请求，并替换本次生成的内容；部分失败时可预览已完成集。':task==='production'?'按场景逐一生成，部分失败时可预览已完成分镜。':''}原版本会自动备份。</div>`,button('取消','close-dialog')+button('开始生成','run-ai','spark','primary'));
  }
  let aiRepair=null;
  function generationProgress(progress){
    const slot=$('[data-generation-progress]');if(!slot)return;
    slot.innerHTML=`<p>${esc(progress.message||'正在处理')}</p>${progress.attempt?`<small>生成轮次 ${progress.attempt} / ${progress.maxAttempts}</small>`:''}${progress.issues?.length?`<ul>${progress.issues.map(issue=>`<li>${esc(issue)}</li>`).join('')}</ul>`:''}`;
  }
  async function runAI(resume=false,useJobOptions=false){
    if(busy)return;
    if(resume&&(!aiRepair||project().id!==aiRepair.job.projectId||project().updatedAt!==aiRepair.sourceUpdatedAt))throw new Error('项目已变化，请根据最新剧本重新生成分镜');
    const job=clone(resume?aiRepair.job:aiJob),original=clone(project()),at=original.updatedAt;
    if(resume){if(aiRepair.draft)job.repairDraft=clone(aiRepair.draft);}
    else if(useJobOptions){aiRepair=null;job.instruction=job.instruction||'';}
    else{
      aiRepair=null;job.instruction=$('#ai-instruction').value;
      if(['script','boards'].includes(job.task))job.episode=Number($('#ai-episode').value);
      if(['bible','directions'].includes(job.task)){job.episodeCount=Number($('#ai-episodes')?.value??job.episodeCount);const seconds=$('#ai-duration')?.value??job.duration;job.duration=seconds==null||seconds===''?null:Number(seconds);if(!Number.isInteger(job.episodeCount)||job.episodeCount<1||job.episodeCount>20)throw new Error('分集数量须在1–20之间');if(job.duration!==null&&(!Number.isInteger(job.duration)||job.duration<1||job.duration>86400))throw new Error('每集时长须在 1–86400 秒之间');if(job.task==='directions'&&!job.instruction.trim())throw new Error('请先填写故事想法与创作要求');}
    }
    busy=true;const controller=new AbortController();aiController=controller;
    let candidate=clone(original),previews=[],warning='',tokens=0,completed=0,repairs=0;
    const jobs=job.task==='all-boards'?original.scripts.filter(A.hasScriptContent).map(e=>({...job,task:'boards',episode:e.number})):job.task==='all-scripts'?original.confirmedBible.outlines.map(o=>({...job,task:'script',episode:o.number})):job.task==='production'?(job.shotIds||original.productions.find(f=>f.id===job.productionId).shots.map(s=>s.id)).map(id=>({...job,shotIds:[id]})):[job];
    try{
      for(const [i,current] of jobs.entries()){
        if(controller.signal.aborted)throw new DOMException('Cancelled','AbortError');
        show('正在生成',`<div class="busy"><div class="spinner"></div><p>${jobs.length>1?'正在处理 '+(i+1)+' / '+jobs.length+'，已完成 '+completed+' 项':'创作模型正在依据项目资料创作…'}</p><div class="generation-progress" data-generation-progress aria-live="polite"></div><p>完成后显示预览；关闭此窗口将取消请求。</p></div>`,button('取消生成','close-dialog'));
        try{
          const result=await A.request(current,candidate,controller.signal,progress=>{if(aiController===controller&&!controller.signal.aborted&&dialog.open)generationProgress(progress);});
          if(controller.signal.aborted)throw new DOMException('Cancelled','AbortError');
          candidate=A.apply(candidate,current,result.data);repairs+=result.repairCount||0;
          previews.push((['script','boards'].includes(current.task)?'第 '+current.episode+' 集'+(current.task==='boards'?' · 目标 '+Fusion.targetLabel(candidate,current.episode)+' 秒 · 合计已校验':'')+'\n':'')+A.preview(current,result.data));tokens+=result.usage?.total_tokens||0;completed++;
        }catch(e){if(e.name==='AbortError'||!completed)throw e;warning='后续生成中断：'+e.message+' 已完成 '+completed+' / '+jobs.length+' 项，可采用已完成内容后继续。';break;}
      }
      if(job.task==='directions'){
        if(project().id!==job.projectId||project().updatedAt!==at)throw new Error('项目内容已变化，请重新生成以免覆盖新修改');
        remember();Object.assign(project(),candidate);markChanged();const saved=await save();busy=false;render();directionCompare(!!saved);return;
      }
      busy=false;aiRepair=null;aiResult={job,candidate,sourceUpdatedAt:at};
      show('生成结果预览',`${warning?`<div class="notice warning">${esc(warning)}</div>`:''}<p>已完成 ${completed} 项${tokens?' · 本次用量 '+tokens+' tokens':''}${repairs?' · 已自动修正 '+repairs+' 轮':''}。采用前保存快照。${job.platformHandoff?'本次修正实际对白、镜头动作和提示词，剧本正文与总目标秒数保留；采用后自动继续交付检查。':''}</p><pre class="preview" translate="no">${esc(previews.join('\n\n────────\n\n'))}</pre>`,(job.directionId?button('返回三个方向','view-directions'):button('放弃','close-dialog'))+button(job.platformHandoff?'采用修正并继续交付':job.task==='script'||job.task==='all-scripts'?'写入剧本正文':'采用结果','adopt-ai','check','primary')+(['bible','section'].includes(job.task)?button('采用并生成剧本','adopt-ai-generate','spark','primary'):''));
    }catch(e){if(aiController===controller)busy=false;if(e.name==='AbortError'||controller.signal.aborted)return;if(job.task==='boards')aiRepair={job,sourceUpdatedAt:at,draft:e.repair?.draft||job.repairDraft||null};show('生成未完成',`<p class="error">${esc(e.message)}</p><p>${aiRepair?.draft?'待修正草稿已保留在当前窗口，可继续让模型修改，无需重新填写要求。':'项目内容未被修改。'}</p>`,button('关闭','close-dialog')+(job.task==='boards'?button(aiRepair?.draft?'继续自动修正':'重新尝试生成','retry-ai','spark','primary'):'')+(job.directionId?button('返回三个方向','view-directions'):'')+button('模型设置','model-settings','settings'));}
  }
  async function handle(action,el){
    if(action.startsWith('event-'))return EventPlanUI.handle(action,el);
    if(action.startsWith('analysis-'))return getAnalysis().handle(action,el);
    if(action==='platform-open'){await PlatformUI.open();return;}
    if(await PlatformUI.handle(action))return;
    switch(action){
      case 'go-characters':close();go('characters');break;
      case 'go-boards':close();go('boards/'+episode);break;
      case 'select-bio':bioId=el.dataset.id;innerNavOpen=false;render();break;
      case 'toggle-inner-nav':innerNavOpen=!innerNavOpen;render();break;
      case 'cancel-directions':aiController?.abort();break;
      case 'fusion-add-character':if(project().bible.characters.length>=100)throw new Error('最多 100 位人物');remember();{const c={id:uid('character'),name:'新人物',role:'',age:null,traits:[],background:'',goal:'',motivation:'',flaw:'',arc:'',relationships:''};project().bible.characters.push(c);bioId=c.id;markChanged(true);go('characters');}break;
      case 'generate-characters':if(!project().bible.core.story.trim()&&!project().bible.core.logline.trim())throw new Error('请先填写故事想法或核心故事');aiPrepare('section',{section:'characters'});break;
      case 'board-episode':go('boards/'+el.dataset.number);break;
      case 'generate-boards':{
        const number=Number(el.dataset.number)||episode;
        if(!project().scripts.some(e=>e.number===number&&A.hasScriptContent(e)))throw new Error('请先写好本集剧本，再生成分镜');
        if(!project().confirmedBible||project().confirmedRevision!==project().revision){
          if(!project().bible.core.logline.trim()||!project().bible.core.story.trim()){
            show('补全故事设定','<p>生成分镜需要一句话梗概和核心故事。</p>',button('返回剧本','close-dialog')+button('填写故事设定','go-bible','book','primary'));
          }else confirm('使用当前故事设定','将当前人物和故事设定用于本集分镜。','confirm-board-settings',`data-number="${number}"`,'确认并继续');
          break;
        }
        await EventPlanUI.startBoards(number);
        break;
      }
      case 'confirm-board-settings':
        if(busy)break;
        remember();C.confirmBible(project());markChanged();close();
        if(await save())await EventPlanUI.startBoards(Number(el.dataset.number));break;
      case 'custom-boards':aiPrepare('boards');break;
      case 'generate-video-plan':aiPrepare('video-plan',{episode:Number(el.dataset.number),shotId:el.dataset.id});break;
      case 'retime-boards':aiPrepare('boards',{retime:true,episode});break;
      case 'generate-all-boards':batchPrepare('boards');break;
      case 'batch-start':await startBatch();break;
      case 'batch-resume':await startBatch(true);break;
      case 'batch-stop':aiController?.abort();break;
      case 'batch-report':batchReport();break;
      case 'batch-outlines':close();go('bible/outlines');break;
      case 'board-source':{const scene=project().scripts.find(e=>e.number===Number(el.dataset.number))?.scenes.find(s=>s.id===el.dataset.scene);if(!scene)throw new Error('原场景已被修改或移除，请重新生成分镜');show('原场景 · '+esc(scene.heading),'<pre class="preview">'+esc(scene.blocks.map(C.blockText).join('\n\n'))+'</pre>',button('关闭','close-dialog'));break;}
      case 'export-boards':{
        if(!project().storyboards.length)throw new Error('请先生成分镜');
        const issues=project().storyboards.filter(b=>!Fusion.timing(project(),b).ready||Fusion.stale(project(),b));
        if(issues.length){show('分镜尚有待复核项',`<p>第 ${issues.map(b=>b.episode).join('、')} 集的时长、对白或源资料尚未通过检查。可以先重排，或导出带状态标记的草稿。</p><div class="preview">${esc(issues.map(b=>{const t=Fusion.timing(project(),b);return '第 '+b.episode+' 集：'+t.total+' 秒 / 目标 '+(Fusion.targetLabel(project(),b.episode)||'未设')+' 秒 · '+t.label+(t.unreviewed?' · 旧版对白未核对':'')+(t.rushed.length?' · 对白过长':'')+(Fusion.stale(project(),b)?' · 源资料已变化':'');}).join('\n'))}</div>`,button('返回检查','close-dialog')+button('导出草稿 CSV','export-boards-draft','download'));break;}
        await saveFile(safeName(project().name)+'-分镜表.csv',Fusion.csv(project()));break;
      }
      case 'export-boards-draft':await saveFile(safeName(project().name)+'-分镜草稿.csv',Fusion.csv(project()));close();break;
      case 'export-characters':await saveFile(safeName(project().name)+'-人物小传.txt',A.preview({task:'section',section:'characters'},project().bible.characters));break;
      case 'export-fusion-script':await saveFile(safeName(project().name)+'.'+format,C.exportScript(project(),format,'all'));break;

      case 'projects':go('projects');break;
      case 'open-project':state.activeId=el.dataset.id;historyProject=project().id;undo=[];redo=[];versionId='current';episode=1;selectedScenes.clear();state.updatedAt=stamp();await save();go(project().storyDirections&&!project().storyDirections.selectedId?'directions':'bible/core');break;
      case 'section':go('bible/'+el.dataset.section);break;
      case 'episode':go('script/'+el.dataset.number);break;
      case 'entities':go('entity');break;
      case 'go-bible':close();go('bible/core');break;
      case 'go-script':close();go('script/'+episode);break;
      case 'go-export':close();go('export');break;
      case 'undo':undoRedo();break;
      case 'redo':undoRedo(true);break;
      case 'close-dialog':close();break;
      case 'project-settings':settings();break;
      case 'choose-status':dialog.querySelectorAll('[data-action="choose-status"]').forEach(b=>b.classList.toggle('active',b===el));break;
      case 'save-settings':{const name=$('#project-name').value.trim();if(!name)throw new Error('请填写项目名称');remember();if(name!==project().name){project().name=name;project().nameSource='manual';}project().audienceProfile=$('#project-audience').value.trim()||'普通成年观众';project().status=dialog.querySelector('[data-action="choose-status"].active').dataset.value;markChanged();close();render();break;}
      case 'confirm-generate':await confirmAndGenerate(el.dataset.number?Number(el.dataset.number):undefined);break;
      case 'prepare-episode':{const number=Number(el.dataset.number),ready=A.scriptReadiness(project(),number);if(['missing-outline','incomplete-outline'].includes(ready.reason))openEpisodeOutline(number);else if(!ready.ready)await confirmAndGenerate(number);else{episode=number;aiPrepare('script',{episode:number});}break;}
      case 'confirm-bible':remember();C.confirmBible(project());A.syncEpisodes(project());markChanged();render();toast('修订 '+project().revision+' 已确认，现有剧本保持不变');break;
      case 'add-character':if(project().bible.characters.length>=100)throw new Error('最多 100 位人物');remember();project().bible.characters.push({id:uid('character'),name:'新人物',role:'',age:null,traits:[],background:'',goal:'',motivation:'',flaw:'',arc:'',relationships:''});markChanged(true);render();$('.form-scroll').scrollTop=$('.form-scroll').scrollHeight;break;
      case 'remove-character':confirm('删除人物','删除这位人物的圣经设定。已有剧本与主体库资料保持不变，可通过撤销恢复。','confirm-remove-character',`data-index="${el.dataset.index}"`,'删除人物');break;
      case 'confirm-remove-character':remember();project().bible.characters.splice(Number(el.dataset.index),1);markChanged(true);close();render();break;
      case 'add-outline':if(project().bible.outlines.length>=300)throw new Error('最多 300 集');remember();project().bible.outlines.push({number:project().bible.outlines.length+1,title:'新的故事',duration:project().bible.outlines.at(-1)?.duration??null,goal:'',conflict:'',turn:'',hook:''});markChanged(true);render();$('.form-scroll').scrollTop=$('.form-scroll').scrollHeight;break;
      case 'add-script':{if(project().scripts.length>=300)throw new Error('最多 300 集');const next=project().scripts.length?Math.max(...project().scripts.map(e=>e.number))+1:1;if(next>300)throw new Error('集号不能超过 300');remember();const outline=project().bible.outlines.find(o=>o.number===next);project().scripts.push({number:next,title:outline?.title||'新的故事',basedOnRevision:project().confirmedRevision,scenes:[]});A.ensureOutline(project(),next);episode=next;markChanged(true);go('script/'+episode);break;}
      case 'add-scene':if(ep().scenes.length>=100)throw new Error('每集最多 100 个场景');remember();ep().scenes.push({id:uid('scene'),heading:'外景 地点 - 日',blocks:[SceneData.action('')]});markChanged();render();$('.form-scroll').scrollTop=$('.form-scroll').scrollHeight;break;
      case 'remove-scene':confirm('删除场景','此场景及其段落将被删除，操作后可撤销。','confirm-remove-scene',`data-index="${el.dataset.index}"`,'删除场景');break;
      case 'confirm-remove-scene':remember();selectedScenes.delete(ep().scenes[Number(el.dataset.index)].id);ep().scenes.splice(Number(el.dataset.index),1);markChanged();close();render();break;
      case 'add-block':{const s=ep().scenes[Number(el.dataset.scene)];if(s.blocks.length>=300)throw new Error('每个场景最多 300 段');remember();s.blocks.push(el.dataset.type==='dialogue'?SceneData.dialogue('',''):SceneData.action(''));markChanged();render();break;}
      case 'remove-block':remember();ep().scenes[Number(el.dataset.scene)].blocks.splice(Number(el.dataset.block),1);markChanged();render();break;
      case 'current-outline':{const o=project().bible.outlines.find(o=>o.number===episode);show('第 '+episode+' 集大纲',o?`<div class="preview" translate="no">${esc(['本集目标：'+o.goal,'核心冲突：'+o.conflict,'关键转折：'+o.turn,'结尾钩子：'+o.hook].join('\n\n'))}</div>`:'<p>本集尚未填写大纲。</p>',button('关闭','close-dialog'));break;}
      case 'entity-type':entityType=el.dataset.value;render();break;
      case 'toggle-ignored':showIgnored=!showIgnored;render();break;
      case 'new-entity':entityDialog();break;
      case 'edit-entity':entityDialog(project().entities.find(e=>e.id===el.dataset.id));break;
      case 'save-entity':{const name=$('#entity-name').value.trim();if(!name)throw new Error('请填写资料名称');if(!el.dataset.id&&project().entities.length>=500)throw new Error('最多 500 条主体资料');remember();const old=project().entities.find(e=>e.id===el.dataset.id),values={name,type:$('#entity-type').value,description:$('#entity-description').value};if(old)Object.assign(old,values,{status:'待确认'});else project().entities.push({id:uid('entity'),...values,status:'待确认'});entityType=values.type;markChanged();close();render();break;}
      case 'confirm-entity':case 'ignore-entity':case 'restore-entity':remember();project().entities.find(e=>e.id===el.dataset.id).status=action==='confirm-entity'?'已确认':action==='ignore-entity'?'已忽略':'待确认';markChanged();render();break;
      case 'delete-entity':confirm('删除资料','删除这条主体资料，可通过撤销恢复。','confirm-delete-entity',`data-id="${el.dataset.id}"`,'删除资料');break;
      case 'confirm-delete-entity':remember();project().entities=project().entities.filter(e=>e.id!==el.dataset.id);markChanged();close();render();break;
      case 'sync-entities':remember();{const n=C.syncEntities(project());markChanged();render();toast('人物资料已同步，新增 '+n+' 条；已确认资料不会被覆盖。');}break;
      case 'snapshot':snapshotDialog();break;
      case 'create-snapshot':{const v=C.snapshot(project(),$('#snapshot-name').value,$('#snapshot-note').value||'手动快照');versionId=v.id;markChanged();close();go('version');versionId=v.id;render();toast('快照已保存');break;}
      case 'version':versionId=el.dataset.id;render();break;
      case 'restore-version':confirm('恢复此版本','将恢复此快照中的设定、剧本和资料。恢复前会自动创建当前内容的备份快照。','confirm-restore-version','','恢复版本');break;
      case 'confirm-restore-version':remember();C.restore(project(),versionId);versionId='current';selectedScenes.clear();markChanged();close();render();toast('版本已恢复，恢复前内容保留在快照中');break;
      case 'format':format=el.dataset.value;render();break;
      case 'scope':scope=el.dataset.value;render();break;
      case 'novel-style':novelStyle=el.dataset.value;render();break;
      case 'export-file':await saveFile(safeName(project().name)+'.'+format,C.exportScript(project(),format,scope,episode,[...selectedScenes]));break;
      case 'backup-recovery':{const raw=localStorage.getItem(KEY+'-recovery');if(!raw)throw new Error('没有未同步副本');await saveFile('一幕-浏览器未同步副本.json',raw);break;}
      case 'backup':await saveFile('一幕-工作区备份.json',JSON.stringify(state,null,2));break;
      case 'import':$('#import-file').value='';$('#import-file').click();break;
      case 'create-production':show('创建影视项目',`<p>把当前剧本的场景与主体资料转入本地制作清单。</p><div class="field"><label for="film-name">影视项目名称</label><input class="input" id="film-name" maxlength="200" value="${esc(project().name)} · 影视制作"></div>`,button('取消','close-dialog')+button('创建影视项目','do-create-production','camera','primary'));break;
      case 'do-create-production':remember();{const film=C.newProduction(project(),$('#film-name').value);markChanged();close();go('production/'+film.id);}break;
      case 'import-production':{const target=$('#production-target').value;if(target==='new'){remember();const film=C.newProduction(project(),project().name+' · 影视制作');markChanged();go('production/'+film.id);}else confirm('导入到已有影视项目','将追加当前剧本的场景，已存在的制作卡保留。','confirm-import-production',`data-id="${target}"`,'导入场景');break;}
      case 'confirm-import-production':{const f=project().productions.find(f=>f.id===el.dataset.id),newShots=project().scripts.flatMap(e=>e.scenes.map(s=>({id:uid('shot'),episode:e.number,heading:s.heading,description:s.blocks.map(C.blockText).join('\n\n'),notes:'',status:'待制作'})));if(f.shots.length+newShots.length>3000)throw new Error('制作卡总数超过 3000');remember();f.shots.push(...newShots);for(const entity of project().entities.filter(e=>e.status!=='已忽略')){if(!f.entities.some(e=>e.name===entity.name&&e.type===entity.type))f.entities.push({name:entity.name,type:entity.type,description:entity.description});}markChanged();close();go('production/'+f.id);break;}
      case 'new-project':if(state.projects.length>=20)throw new Error('最多 20 个本地项目');show('新建项目',`<div class="field"><label for="new-name">项目名称</label><input id="new-name" class="input" maxlength="200" placeholder="给故事取一个名字"></div><div class="field"><label for="new-logline">一句话梗概</label><textarea id="new-logline" maxlength="10000" placeholder="主角是谁，想做什么，遇到了怎样的困难？"></textarea></div>`,button('取消','close-dialog')+button('开始创作','do-new-project','plus','primary'));break;
      case 'do-new-project':{const name=$('#new-name').value.trim(),p=SceneData.blankProject(name||'未命名项目');p.nameSource=name?'manual':'auto';p.bible.core.logline=$('#new-logline').value;state.projects.unshift(p);state.activeId=p.id;undo=[];redo=[];historyProject=p.id;episode=1;selectedScenes.clear();markChanged();close();go('bible/core');break;}
      case 'refresh-source':show('同步最新故事','<p>读取助手或其他页面保存的最新内容。当前浏览器内容会先保留为恢复备份；未同步的改动不会合并。</p>',button('取消','close-dialog')+button('备份并读取最新','reload-source','refresh','primary'));break;
      case 'reload-source':{if(busy)throw new Error('请先完成或取消当前生成任务');await saveQueue;localStorage.setItem(KEY+'-recovery',JSON.stringify(state));const r=await fetch('/api/workspace');if(!r.ok)throw new Error('故事读取失败，请稍后重试');const data=await r.json(),previous=project().id;if(!data)throw new Error('平台暂时没有已保存的故事');state=C.cleanWorkspace(data);if(state.projects.some(p=>p.id===previous))state.activeId=previous;diskTag=r.headers.get('ETag');diskSafe=true;undo=[];redo=[];historyProject=project().id;close();saveStatus('已保存');route();toast('已读取最新故事，本地修改已保留恢复备份');break;}
      case 'studio-home':StoryHost.home();break;
      case 'workflow':workflow();break;
      case 'save-model':await saveModel(false);break;
      case 'test-model':await saveModel(true);break;
      case 'clear-model-key':await saveModel(false,true);break;
      case 'generate-bible':if(project().storyDirections)directionCompare();else await startDirections();break;
      case 'new-directions':await startDirections();break;
      case 'view-directions':directionCompare();break;
      case 'choose-direction':await chooseDirection(el);break;
      case 'generate-all-scripts':batchPrepare('scripts');break;
      case 'parse-entities':aiPrepare('parse');break;
      case 'generate-production':aiPrepare('production');break;
      case 'open-production':close();go('production/'+el.dataset.id);break;
      case 'generate-shot':aiPrepare('production',{shotIds:[el.dataset.id]});break;
      case 'export-production':{const f=project().productions.find(f=>f.id===filmId);if(!f)throw new Error('影视项目不存在');await saveFile(safeName(f.name)+'-分镜.txt',f.name+'\n\n'+f.shots.map((s,i)=>'场景 '+(i+1)+' · 第 '+s.episode+' 集 · '+s.heading+'\n'+s.notes).join('\n\n'));break;}
      case 'model-settings':await getStatus();modelSettings();break;
      case 'model-status':await getStatus();modelSettings();break;
      case 'regenerate':aiPrepare('section');break;
      case 'generate-script':aiPrepare('script');break;
      case 'generate-novel':aiPrepare('novel');break;
      case 'run-ai':await runAI();break;
      case 'retry-ai':await runAI(true);break;
      case 'adopt-ai':case 'adopt-ai-generate':{
        if(!aiResult||project().id!==aiResult.job.projectId||project().updatedAt!==aiResult.sourceUpdatedAt)throw new Error('项目内容已变化，请重新生成以免覆盖新修改');
        const task=aiResult.job.task,number=aiResult.job.episode,handoff=aiResult.job.platformHandoff;
        remember();C.snapshot(project(),'AI 生成前 · 修订 '+project().revision,'采用 AI 结果前的自动快照');const snapshots=project().snapshots;Object.assign(project(),aiResult.candidate,{snapshots});markChanged();close();
        if(task==='novel')go('novel/'+project().novels[0].id);else if(task==='parse')go('entity');else if(['boards','all-boards','video-plan'].includes(task))go('boards/'+(number||1));else if(task==='section'&&aiResult.job.section==='characters')go('characters');else if(task==='all-scripts'||task==='script')go('script/'+(task==='script'?number:1));else render();
        const saved=await save();toast(saved?'生成结果已采用并保存':'生成结果已保留在浏览器，请导出备份后刷新以解决保存冲突');
        if(handoff&&saved){await PlatformUI.open(handoff);await PlatformUI.handle('platform-preview');break;}
        if(['bible','section'].includes(task)){
          if(action==='adopt-ai-generate'){if(saved)await confirmAndGenerate();}
          else show('设定已保存，下一步生成剧本',`<p>创作圣经已更新。确认当前设定后，创作模型将按分集大纲生成剧本正文。</p><p>当前有 ${project().bible.outlines.length} 集大纲。生成结果先预览，再写入正文。</p>`,button('继续查看设定','close-dialog')+button('确认并生成剧本','confirm-generate','spark','primary'));
        }
        break;
      }
      case 'open-novel':go('novel/'+el.dataset.id);break;
      case 'export-novel':{const n=project().novels.find(n=>n.id===novelId);await saveFile(safeName(n.name)+'.txt',n.content);break;}
      case 'community':show('社区',`<p>原站社区正在内测，本地版保留入口。</p><p><a class="button" href="https://sceneone.io/" target="_blank" rel="noopener noreferrer">访问一幕原站 ↗</a></p>`,button('关闭','close-dialog'));break;
      case 'about':show('剧本创作',`<p>在同一个故事项目中完成故事设定、人物塑造、分集剧本、AI 分镜与视频制作。</p><p>人物与原场景直接关联到分镜，生成结果先预览再采用，采用前保留版本快照。</p><p>所有项目保存到本机。AI 创作使用当前创作模型。</p><div class="backup-buttons">${button('设置','model-settings','settings')}${button('导出备份','backup','download')}</div>`,button('完成','close-dialog','','primary'));break;
    }
  }
  function safeName(name){return name.replace(/[<>:"/\\|?*]/g,'_').slice(0,90)||'剧本';}
  document.addEventListener('click',async event=>{const link=event.target.closest('a[href^="#"]');if(link){event.preventDefault();go(link.getAttribute('href').slice(1));return;}const el=event.target.closest('[data-action]');if(!el||el.disabled)return;try{await handle(el.dataset.action,el);}catch(e){toast(e.message||'操作未完成');}});
  document.addEventListener('focusin',e=>{if(e.target.matches('[data-bind],[data-character-traits]'))remember();});
  function bindInput(el){const keys=el.dataset.bind.split('.');let obj=project();for(const key of keys.slice(0,-1))obj=obj[key];const key=keys.at(-1),shotDuration=keys[0]==='storyboards'&&key==='duration';if(shotDuration&&!Fusion.validDuration(Number(el.value))){el.value=String(obj[key]);toast('单镜时长只允许 5–15 秒整数');return;}const value=shotDuration?Number(el.value):el.type==='number'?((key==='age'||key==='durationMin'||keys[0]==='bible'&&key==='duration')&&el.value===''?null:Math.max(Number(el.min||0),Math.min(Number(el.max||86400),Math.trunc(Number(el.value)||0)))):el.value;if(keys[0]==='bible'&&keys[1]==='outlines'&&((key==='durationMin'&&value!=null&&value>obj.duration)||(key==='duration'&&value!=null&&obj.durationMin!=null&&value<obj.durationMin))){return;}if(obj[key]===value)return;obj[key]=value;if(keys[0]==='bible'&&key==='duration'&&value===null)delete obj.durationMin;markChanged(keys[0]==='bible');}
  document.addEventListener('input',e=>{if(e.target.dataset.analysisField==='persona')getAnalysis().change(e.target);if(e.target.dataset.bind)bindInput(e.target);if(e.target.dataset.characterTraits){const c=project().bible.characters.find(c=>c.id===e.target.dataset.characterTraits);const traits=e.target.value.split(/[,，、]+/).map(t=>t.trim()).filter(Boolean);if(c&&traits.length<=30&&traits.every(t=>t.length<=100)){c.traits=traits;markChanged(true);}}if(e.target.id==='search'){search=e.target.value;const start=e.target.selectionStart;render();$('#search').focus();$('#search').setSelectionRange(start,start);}});
  document.addEventListener('change',e=>{const el=e.target;
    if(el.dataset.bind?.startsWith('bible.outlines.')&&['duration','durationMin'].includes(el.dataset.bind.split('.').at(-1))){
      const [, ,index,key]=el.dataset.bind.split('.'),outline=project().bible.outlines[index];
      if(el.value!==''&&Number(el.value)!==outline[key]){el.value=outline[key]??'';toast('请先设置有效的上下限，最短时长不能超过最长时长');}
    }
    if(el.dataset.analysisField){getAnalysis().change(el);return;}if(el.id==='batch-mode'){try{$('#batch-plan').innerHTML=batchPlanHTML(SceneBatch.plan(project(),batchKind,el.value));}catch(error){toast(error.message);}return;}if(el.dataset.bind&&el.tagName==='SELECT')bindInput(el);if(el.dataset.sceneSelect){el.checked?selectedScenes.add(el.dataset.sceneSelect):selectedScenes.delete(el.dataset.sceneSelect);const meta=$('.script-meta');if(meta&&ep())meta.textContent=`依据圣经修订 ${ep().basedOnRevision} · 当前已确认修订 ${project().confirmedRevision} · ${selectedScenes.size} 个场景已选中`;}if(el.dataset.bind&&(['visualStyle','aspectRatio'].includes(el.dataset.bind)||(el.dataset.bind.startsWith('storyboards.')&&(el.dataset.bind.endsWith('.duration')||el.dataset.bind.endsWith('.spokenText')))))render();if(el.id==='export-episode')episode=Number(el.value);if(el.id==='language'){state.locale=el.value;state.updatedAt=stamp();save();render();}});
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save().then(()=>toast(saveLabel));}});
  dialog.addEventListener('cancel',()=>{if(batchActive){batchDialogClosed=true;aiController?.abort();return;}if(busy){aiController?.abort();busy=false;}});
  $('#import-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>20*1024*1024)throw new Error('文件不能超过 20 MB');const incoming=C.cleanWorkspace(JSON.parse(await file.text()));if(incoming.projects.length+state.projects.length>20)throw new Error('导入后项目总数超过 20');const projects=incoming.projects.map(p=>({...p,id:uid('project'),name:p.nameSource==='auto'&&p.storyDirections?.selectedId?p.name:p.name.slice(0,180)+' · 导入',updatedAt:stamp()}));state.projects.unshift(...projects);state.activeId=projects[0].id;historyProject=state.activeId;undo=[];redo=[];selectedScenes.clear();markChanged();close();go('bible/core');toast('导入完成，原有项目保持不变');}catch(e){toast('导入失败：'+e.message);}});
  const english={'首页':'Home','项目':'Projects','虚拟角色':'Characters','设置':'Settings','社区':'Community','项目空间 /':'Workspace /','我的项目':'My projects','剧本创作':'Screenwriting','项目设置':'Project settings','创建影视项目':'Create film project','本地创作者':'Local creator','本地版':'Local','创作圣经':'Story bible','剧本':'Script','主体库':'Entities','版本管理':'Versions','导出':'Export','故事核心':'Story core','世界与规则':'World & rules','人物与关系':'Characters','总体结构':'Structure','分集大纲':'Episodes','已确认':'Confirmed','待确认':'Pending','重新生成':'Regenerate','一句话梗概':'Logline','核心故事':'Core story','题材':'Genre','叙事基调':'Narrative tone','主题表达':'Theme','时代与背景':'Era & setting','主要地点（每行一个）':'Locations (one per line)','世界规则（每行一条）':'World rules (one per line)','不可违反的事实（每行一条）':'Invariants (one per line)','角色定位':'Role','目标':'Goal','动机':'Motivation','缺陷':'Flaw','人物弧':'Character arc','人物关系':'Relationships','添加人物':'Add character','故事主线':'Main storyline','开端':'Opening','发展':'Development','高潮':'Climax','结局':'Ending','本集目标':'Episode goal','核心冲突':'Core conflict','关键转折':'Turning point','结尾钩子':'Closing hook','确认当前修订':'Confirm revision','确认圣经':'Confirm bible','确认后的圣经将成为 AI 生成剧本的权威依据。后续修改不会自动覆盖现有剧本。':'The confirmed bible guides AI script generation. Later edits do not overwrite existing scripts.','项目资料':'Project assets','角色':'Characters','场景':'Locations','道具':'Props','新建':'New','同步人物设定':'Sync characters','确认资料':'Confirm','忽略':'Ignore','编辑':'Edit','版本历史':'Version history','创建快照':'Create snapshot','当前剧本':'Current script','当前':'Current','实时内容':'Live content','导出文件':'Export file','将剧本导出为本地文件':'Export the script to a local file','格式':'Format','范围':'Scope','全文':'Full script','当前集':'Current episode','选中场景':'Selected scenes','立即导出':'Export now','导入到影视项目':'Import into film project','影视项目':'Film project','导入':'Import','AI 改编为小说':'Adapt into a novel','叙事风格':'Narrative style','第三人称全知':'Third-person omniscient','第三人称限知':'Third-person limited','第一人称':'First person','开始改编':'Start adaptation','取消':'Cancel','保存':'Save','关闭':'Close','完成':'Done','项目名称':'Project name','项目状态':'Project status','默认空间':'Default workspace','个人空间':'Personal','进行中':'In progress','已暂停':'Paused','已完成':'Completed','新建项目':'New project','开始创作':'Start writing','本集大纲':'Episode outline','添加场景':'Add scene','动作':'Action','对白':'Dialogue','添加分集':'Add episode','返回剧本':'Back to script','恢复此版本':'Restore version','秒':'sec','导出备份':'Export backup'};
  function translateUI(root){if(state.locale!=='en')return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=walker.nextNode())){if(n.parentElement.closest('[translate="no"],textarea,option,script,style'))continue;const trimmed=n.nodeValue.trim();if(english[trimmed])n.nodeValue=n.nodeValue.replace(trimmed,english[trimmed]);}document.documentElement.lang='en';}
  async function getStatus(){try{const r=await fetch('/api/status',{signal:AbortSignal.timeout(2500)});const s=await r.json();if(!r.ok||s.app!=='storyfusion-local')throw new Error();serverConnected=true;model={...s,managed:!!StoryHost.managedModel||!!s.managed};}catch{serverConnected=false;model={configured:false,managed:!!StoryHost.managedModel};}}
  async function init(){let browserData=false;try{const raw=localStorage.getItem(KEY);if(raw){state=C.cleanWorkspace(JSON.parse(raw));browserData=true;}}catch{toast('浏览器旧数据未能读取，请保留备份文件。');}historyProject=project().id;route();const at=state.updatedAt;if(location.protocol.startsWith('http')){await getStatus();if(serverConnected){try{const r=await fetch('/api/workspace');if(!r.ok)throw new Error();const data=await r.json();diskTag=r.headers.get('ETag');if(data&&state.updatedAt===at){const valid=C.cleanWorkspace(data);if(browserData&&state.updatedAt>valid.updatedAt){localStorage.setItem(KEY+'-recovery',JSON.stringify(state));toast('已载入磁盘最新版本；浏览器未同步内容已另存，可在设置中导出。');}state=valid;}}catch{diskSafe=false;toast('磁盘数据读取异常，已停止覆盖磁盘文件，请保留 data 目录备份。');}historyProject=project().id;route();await save();}}}
  EventPlanUI.configure({project,episode:()=>episode,show,close,timeout:()=>model.timeoutSeconds,busy:value=>{busy=value;},ready:()=>{if(busy){toast('请先完成当前任务');return false;}if(!serverConnected||!diskSafe){toast('请先恢复项目保存连接');return false;}if(!model.configured){modelSettings();return false;}return true;},persist:async(updated,label)=>{remember();C.snapshot(project(),label,'剧情事件与拍摄版本变更前备份');const snapshots=project().snapshots;Object.assign(project(),updated,{snapshots});markChanged();const saved=await save();render();if(!saved)throw new Error('方案已保留在浏览器，磁盘保存尚未完成；请恢复连接后重试');},boards:(number,startNow=false)=>{episode=number;return aiPrepare('boards',{episode:number},startNow);}});
  PlatformUI.configure({project,episode:()=>episode,show,toast,preflight:number=>{if(EventPlan.status(project(),number).ready)return true;EventPlanUI.open(number);return false;},production:receipt=>StoryHost.production(receipt),repairBoards:async choice=>{if(busy)throw new Error('请先完成或取消当前生成任务');if(!serverConnected||!diskSafe)throw new Error('请先恢复项目保存，再修正分镜');if(!model.configured){modelSettings();return;}episode=choice.episode;if(!EventPlan.status(project(),episode).ready){EventPlanUI.open(episode);return;}aiPrepare('boards',{retime:true,episode,forPlatform:true,platformHandoff:choice});await runAI();}});
  SceneEditor.configure({project,remember,changed:markChanged,render,selectedScenes,setEpisode:n=>episode=n,model:()=>model,modelSettings,show,close,handle,toast,undoRedo});
  window.addEventListener('hashchange',route);window.addEventListener('popstate',route);window.addEventListener('beforeunload',()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save();});await init().then(async()=>{
    StoryHost.onStart(async intent=>{
      if(busy)throw new Error('请先完成或取消当前生成任务，再创建新主题');
      if(intent.kind==='import'){if(StoryHost.projects?.())return;go('projects');show('导入已有项目','<p>选择此前导出的项目 JSON 备份。原有项目会保留。</p>',button('选择项目文件','import','upload','primary'));return;}
      if(intent.kind==='projects'){go('projects');return;}
      if(intent.kind!=='new'||typeof intent.idea!=='string'||!intent.idea.trim()||!/^[0-9a-f-]{36}$/i.test(intent.id))throw new Error('新主题信息不完整，请返回创作首页重新填写');
      const existing=state.projects.find(p=>p.id==='p-story-'+intent.id);if(existing){state.activeId=existing.id;historyProject=existing.id;episode=1;directionCompare();await bindSource();StoryHost.started?.(intent.id);return;}
      if(state.projects.length>=20)throw new Error('项目数量已达上限，请先在我的项目中整理项目');
      const count=Math.min(20,Math.max(1,Math.floor(Number(intent.episodes)||1))),duration=intent.timingMode==='story'||intent.duration==null?null:Math.min(600,Math.max(5,Number(intent.duration)||15));
      if(intent.durationMin!=null)EventPlan.durationRange(duration,intent.durationMin);
      const p=SceneData.blankProject(intent.idea.trim().slice(0,18));p.nameSource='auto';p.id='p-story-'+intent.id;p.bible.core.logline=intent.idea.slice(0,4000);p.aspectRatio=['9:16','16:9','1:1','4:3','3:4','21:9'].includes(intent.ratio)?intent.ratio:'9:16';
      p.bible.outlines=Array.from({length:count},(_,i)=>({number:i+1,title:'第 '+(i+1)+' 集',duration,...(intent.durationMin!=null?{durationMin:intent.durationMin}:{}),goal:'',conflict:'',turn:'',hook:''}));
      state.projects.unshift(C.cleanProject(p));state.activeId=p.id;undo=[];redo=[];historyProject=p.id;episode=1;selectedScenes.clear();markChanged();const saved=await save();go('directions');if(saved)await bindSource();StoryHost.started?.(intent.id);if(saved)await startDirections();else{directionState={projectId:p.id,phase:'failed',error:'项目未能保存，请恢复连接或解决保存冲突后再试。',saved:false};render();}
    });
    const params=new URLSearchParams(location.search),requested=params.get('scriptProject');
    if(requested){const found=state.projects.find(p=>p.id===requested);if(found){state.activeId=found.id;historyProject=found.id;episode=Number(params.get('episode'))||1;route();}else{go('projects');toast('当前账号下未找到这部剧本，请从项目列表选择。');}}
    else if(StoryHost.targetProject){await fetch('/api/platform/links').then(r=>r.json()).then(data=>{const link=data.items?.find(row=>row.project_id===StoryHost.targetProject),found=state.projects.find(p=>p.id===link?.source_project_id);if(found){state.activeId=found.id;historyProject=found.id;episode=link.episode;route();}else{go('projects');toast('此制作记录尚未关联剧本，请选择原稿后在“制作准备”中关联。');}}).catch(()=>toast('项目关联读取失败，请刷新重试。'));}
    if(requested||StoryHost.targetProject)await bindSource();
    StoryHost.ready();
  });
})().catch(error=>StoryHost.fail?.(error));


return {...scope.api, handoff:()=>scope.api.handoff(()=>PlatformUI.resumeProduction())};
}
