var UtilsGlobal=(()=>{var w=Object.defineProperty;var k=(s,e,t)=>e in s?w(s,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):s[e]=t;var a=(s,e)=>w(s,"name",{value:e,configurable:!0});var y=(s,e,t)=>(k(s,typeof e!="symbol"?e+"":e,t),t);function L(s){var e=s.lastIndexOf("/");return e===-1?s:s.slice(e+1)}a(L,"getFileName");function P(s){var e=s.lastIndexOf(".");return e===-1||e===s.length-1||e===0?s:s.substr(0,e)}a(P,"getFileNameWithoutExtension");function D(s,e){for(var t=e.toLowerCase(),n=[],i=0;i<s.length;i++){var r=s[i];if(r){for(var o=!1,l=-1,c=r.length;(l=t.indexOf(r,l))!==-1;)n.push([l,l+c]),l+=c+1,o=!0;if(!o)return null}}return a(function(d){if(d.length===0)return d;d.sort(function(v,C){return v[0]-C[0]});for(var h=[d[0]],g=1;g<d.length;g++){var f=d[g],p=h[h.length-1];p[1]<f[0]?h.push(f):p[1]<f[1]&&(p[1]=f[1])}return h},"mergeRanges")(n)}a(D,"getMatchingIndexes");function E(s,e,t){var n=D(s,e,t);return n?{score:O(n,s.length,t,0),matches:n}:null}a(E,"getMatchResult");function H(s,e){for(var t=0;t<s.length;t++){var n=s[t];n[0]+=e,n[1]+=e}}a(H,"visitMatchingIndexes");function O(s,e,t,n){for(var i=n,r=-1,o=0;o<s.length;o++){var l=s[o],c=l[0],u=l[1];c>r&&(i+=(c-r-1)/t),i+=(u-c+1)/t,r=u}return r<t-1&&(i+=(t-r-1)/t),i/e}a(O,"calculateScore");function A(s){return s.split(".").pop()}a(A,"getFileExtension");var b=Object.prototype.hasOwnProperty;function $(s){return s?B(s,/^alias(es)?$/i):null}a($,"getAliases");function B(s,e,t){if(!s)return null;var n=function(d,h){if(typeof h=="string")return b.call(d,h)?d[h]:null;for(var g in d)if(b.call(d,g)&&h.test(g))return d[g];return null}(s,e);if(!n)return null;var i=[];if(typeof n=="string"&&(n=n.split(/[,\n]/)),Array.isArray(n)){for(var r=0;r<n.length;r++){var o=n[r];if(typeof o=="string")if(t)for(var l=o.split(/\s/g),c=0;c<l.length;c++){var u=l[c];u&&i.push(u)}else o=o.trim(),o&&i.push(o)}return i.length===0?null:i}return null}a(B,"findMatchingProperties");function T(s,e){var t=s.toLowerCase().split(" "),n=[];for(var i in e)if(b.call(e,i)&&A(i)==="md"){var r=L(i),o=P(r),l=E(t,r,o.length),c=E(t,o,r.length);l?(l.score+=.8,H(l.matches,o.length-r.length),n.push({type:"file",path:i,match:l})):c&&(c.score+=.5,n.push({type:"file",path:i,match:c}));var u=e.hasOwnProperty(i)?e[i]:null;if(u){var d=$(u.frontmatter);if(d)for(var h=0;h<d.length;h++){var g=d[h],f=E(t,g);f&&n.push({type:"alias",alias:g,path:i,match:f})}if(u.headings)for(var h=0;h<u.headings.length;h++){var p=u.headings[h],v=E(t,p.heading);v&&n.push({type:"heading",path:i,heading:p,match:v})}}}return n.sort(function(C,x){return x.match.score-C.match.score}),n.slice(0,50)}a(T,"search");window.simpSearch=T;function I(s,e,t,n=0){U(e,t,n).forEach(i=>{s.appendChild(i)})}a(I,"highlightText");function U(s,e,t=0){if(!e)return[document.createTextNode(s)];let n=[],i=0;for(let r=0;r<e.length;r++){let[o,l]=e[r],c=o+t,u=l+t;if(!(u<=0)){if(c>=s.length)break;c>i&&n.push(document.createTextNode(s.substring(i,c))),n.push(z(s.substring(c,u))),i=u}}return i<s.length&&n.push(document.createTextNode(s.substring(i))),n}a(U,"highlightNodes");function z(s){let e=document.createElement("span");return e.classList.add("suggestion-highlight"),e.textContent=s,e}a(z,"createHighlightNode");function W(s,e,t){Object.defineProperty(s,e,{value:t,enumerable:!1,configurable:!0,writable:!0})}a(W,"defineProperty");function G(){W(Element.prototype,"matchParent",function(s,e){if(this.matches(s))return this;if(this===e)return null;let t=this.parentElement;return t?t.matchParent(s,e):null})}a(G,"initUtils");G();var m=class{constructor(e,t){this.chooser=e,this.containerEl=t,this.selectedItem=0,this.containerEl.addEventListener("click",this.onSuggestionClick.bind(this)),this.containerEl.addEventListener("mousemove",this.onSuggestionMouseover.bind(this)),key("up",this.moveUp.bind(this)),key("down",this.moveDown.bind(this)),key("enter",this.onEnter.bind(this))}moveUp(e){if(!e.isComposing){let t=this.selectedItem-1;if(t>=0)return this.setSelectedItem(t,e),!1}}moveDown(e){if(!e.isComposing){let t=this.selectedItem+1;if(t<this.suggestions.length)return this.setSelectedItem(t,e),!1}}onEnter(e){this.useSelectedItem(e)}setSuggestions(e){for(;this.containerEl.firstChild;)this.containerEl.removeChild(this.containerEl.firstChild);this.values=e,this.renderSuggestions(),this.setSelectedItem(0)}renderSuggestions(){this.suggestions=[],this.values.forEach(e=>{let t=this.createSuggestionItem(e);this.suggestions.push(t)})}createSuggestionItem(e){let t=document.createElement("div");return t.classList.add("suggestion-item"),this.containerEl.appendChild(t),this.chooser.renderSuggestion(e,t),t}setSelectedItem(e,t){let n=this.suggestions[this.selectedItem];n==null||n.classList.remove("is-selected"),this.selectedItem=e,this.selectSuggestionItem(e,t)}selectSuggestionItem(e,t){let n=this.suggestions[e];n==null||n.classList.add("is-selected"),n==null||n.scrollIntoView({block:"nearest"});let i=this.selectedItem;if(this.selectedItem=e,i!==e){let r=this.suggestions[i];r&&r.classList.remove("is-selected")}this.chooser.onSelectedChange&&this.chooser.onSelectedChange(this.values[e],t)}onSuggestionClick(e){let t=e.target.matchParent(".suggestion-item",e.currentTarget);if(!t)return;let n=t,i=this.suggestions.indexOf(n);this.setSelectedItem(i,e),this.useSelectedItem(e)}onSuggestionMouseover(e){let t=e.target.matchParent(".suggestion-item",e.currentTarget);if(!t)return;let n=t,i=this.suggestions.indexOf(n);this.setSelectedItem(i,e)}useSelectedItem(e){let t=this.values[this.selectedItem];return t?(this.chooser.selectSuggestion(t,e),this.setSuggestions([]),!0):!1}};a(m,"SuggestionsList");window.SuggestionsList=m;function M(s,e,t){t=t||{},e.style.display="block";let n=t.gap!==void 0?t.gap:0,i=t.preference!==void 0?t.preference:"bottom",r=t.offsetParent!==void 0?t.offsetParent:e.offsetParent||e.ownerDocument.documentElement,o=t.horizontalAlignment!==void 0?t.horizontalAlignment:"left",l=Math.min(s.top,r.scrollTop+r.clientHeight-e.offsetHeight-10),c=Math.max(s.bottom,r.scrollTop+10),u=s.top-r.scrollTop>=e.offsetHeight+n,d=r.scrollTop+r.clientHeight-s.bottom>=e.offsetHeight+n,h=0,g="";!u||i==="bottom"&&d?r.clientHeight<e.offsetHeight+n?(h=r.scrollTop,g="overlap"):i==="top"?(h=r.scrollTop+n,g="overlap"):(h=c+n,g="bottom"):(h=l-n,g="top");let f=o==="left"?s.left:s.right-e.offsetWidth;return f<r.scrollLeft+10?f=r.scrollLeft+10:f+e.offsetWidth>r.scrollLeft+r.clientWidth-10&&(f=r.scrollLeft+r.clientWidth-e.offsetWidth-10),e.style.top=`${h}px`,e.style.left=`${f}px`,{top:h,left:f,result:g}}a(M,"positionTooltip");var S=class{constructor(e,t){y(this,"onDocumentClick",a(function(e){e.defaultPrevented,this.resultEl.remove()},"onDocumentClick"));this.outerContainerEl=document.createElement("div"),this.outerContainerEl.classList.add("search-view-outer"),this.containerEl=e.querySelector(".search-view-container"),this.inputEl=e.querySelector(".search-bar"),this.resultEl=document.createElement("div"),this.resultEl.classList.add("search-results"),this.metadata=t,this.chooser=new m(this,this.resultEl),this.inputEl.addEventListener("input",()=>{console.log("update search..."),this.updateSearch()}),document.addEventListener("click",this.onDocumentClick.bind(this)),key("esc",this.onDocumentClick.bind(this))}addMessage(e){let t=document.createElement("div");t.classList.add("search-message"),this.resultEl.appendChild(t),t.innerText=e}updateSearch(){for(;this.resultEl.firstChild;)this.resultEl.removeChild(this.resultEl.firstChild);if(!this.inputEl.value){this.inputEl.classList.remove("has-no-results"),this.resultEl.parentElement.removeChild(this.resultEl);return}document.body.appendChild(this.resultEl),M(this.inputEl.getBoundingClientRect(),this.resultEl,{gap:5});let e=T(this.inputEl.value,this.metadata);this.chooser.setSuggestions(e),e.length===0&&(this.inputEl.classList.toggle("has-no-results",!0),this.chooser.addMessage("No results found."))}renderSuggestion(e,t){t.classList.add("mod-complex");let n=document.createElement("div");n.classList.add("suggestion-content");let i=document.createElement("div");i.classList.add("suggestion-title");let r=document.createElement("div");r.classList.add("suggestion-note"),n.appendChild(i),n.appendChild(r);let o=document.createElement("div");if(o.classList.add("suggestion-aux"),t.appendChild(n),t.appendChild(o),e.type==="file"){let l=L(e.path),c=e.path.lastIndexOf("/"),u=c===-1?".":e.path.substring(0,c);I(r,u,e.match),I(i,l,e.match,e.path.length-l.length)}else if(e.type==="heading"){i.innerText=`# ${e.heading.heading}`,I(i,e.heading.heading,e.match),r.innerText=e.path;let l=document.createElement("span");l.classList.add("suggestion-flair"),l.innerText="H",o.appendChild(l)}}selectSuggestion(e,t){var n,i;e.type==="file"||e.type==="alias"?loadDocument((n=e.path)==null?void 0:n.replace(/\.md$/,".html"),!0,!1):e.type==="heading"&&loadDocument(((i=e.path)==null?void 0:i.replace(/\.md$/,".html"))+"#"+encodeURIComponent(e.heading.heading),!0,!0),this.inputEl.value="",this.updateSearch(),this.containerEl.classList.remove("is-left-column-open")}};a(S,"SearchView");window.SearchView=S;})();
