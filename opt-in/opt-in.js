'use strict';

function OptInType(ident, caption, onAllowed){
  var that = this;
  this.className = 'OptInType';
  this.ident = ident;
  this.caption = caption;
  this.isRequired = false;
  this.defaultConsent = false,
  this.onAllowed = (onAllowed) ? onAllowed : OptIn.onAllowedDefault;
  this.onDisallowed = null;
  
  this.getConsent = function(){
    return OptIn.getConsent(that.ident);
  }
  
  this.setConsent = function(value){
    OptIn.setConsent(that.ident, value);
  }
  
  this.update = function(){
    var a = that.isRequired || that.getConsent();
    if (a) {
      if (that.onAllowed){
        try{
          if (typeof that.onAllowed == 'string'){
            eval(that.onAllowed);
          } else if (typeof that.onAllowed == 'function'){
            that.onAllowed(that);
          }
        } catch(e){}
      }
    } else {
      if (that.onDisallowed){
        try{
          if (typeof that.onDisallowed == 'string'){
            eval(that.onDisallowed);
          } else if (typeof that.onDisallowed == 'function'){
            that.onDisallowed(that);
          }
        } catch(e){}
      }
    }
  }
  
  this.blockIFrame = function(findUrl, replaceUrl){
    OptIn.blockIFrame(findUrl, replaceUrl, that.ident);
  }
  
  this.unblockIFrame = function(){
    OptIn.unblockIFrame(that.ident);
  }
  
  OptIn.addOptInType(this);
}

var OptIn = {
  isAllowed: '✔',
  isNotAllowed: '✖',
  thisSessionOnly: false,
  readMoreUrl: false,
  minDrawWidthInEm: 32,
  triggerFirstVisitPopup: true,
  shortHTML: 'To protect your privacy we have disabled some features until you consent, some other that do not store or share identifying information have been allowed.',
  items: [],
  frmOptInWrap: null,
  frmOptIn: null,
  draw: null,
  event: new Event('OptIn_Changed'),
  
  calc1em: function(){
    if ((typeof OptIn._1em != 'undefined') && (OptIn._1em))
      return OptIn._1em;
    var div = document.createElement('div');
    div.style.width = '100em';
    document.body.appendChild(div);
    OptIn._1em = div.offsetWidth / 100;
    div.remove();
    return OptIn._1em;
  },
  
  isReadMorePage: function(){
    if (!OptIn.readMoreUrl) 
      return false;
    return (document.location.pathname == OptIn.readMoreUrl);
  },
  
  addOptInType: function(aOptInType){
    if (aOptInType instanceof OptInType)
      return OptIn.items.push(aOptInType);
    else
      return false;
  },
  
  findItemByIdent: function(ident){
    var i;
    for (i=0; i<OptIn.items.length; i++){
      if (OptIn.items[i].ident == ident)
        return OptIn.items[i];
    }
    return null;
  },
  
  getStorage: function(){
    var m = null;
    try{
      m = (OptIn.thisSessionOnly) ? sessionStorage : localStorage;
    } catch(e){}
    return m;
  },
  
  getItem(name){
    var m = OptIn.getStorage();
    try {
      return (m) ? m.getItem(name) : null;
    } catch(e){
      return null;
    }
  },
  
  setItem(name, value){
    var m = OptIn.getStorage();
    try{
      if (m)
        m.setItem(name, value);
    } catch(e){}
  },
  
  getConsent: function(ident){
    var itm = OptIn.findItemByIdent(ident);
    if (!itm)
      return null;
    var v = OptIn.getItem('OptIn.concent.'+ident);
    if (v == null)
      return itm.defaultConsent;
    return (v == 'Y');
  },
  
  setConsent: function(ident, value){
    var v = (value) ? 'Y' : 'N';
    OptIn.setItem('OptIn.concent.'+ident, v);
    OptIn.update();
  },
  
  clearConsent: function(ident){
    var m = OptIn.getStorage();
    if (m)
      try{m.removeItem('OptIn.concent.'+ident);} catch(e){}
    OptIn.update();
  },
  
  hasConsentSettings: function(){
    var i, itm;
    var m = OptIn.getStorage();
    if (m){
      for (i=0; i<OptIn.items.length; i++){
        itm = OptIn.items[i];
        if ((!itm.isRequired) && (m.getItem('OptIn.concent.'+itm.ident) != null))
          return true;
      }
    }
    return false;
  },
  
  hasOptionalItems: function(){
    var i, itm;
    for (i=0; i<OptIn.items.length; i++){
      if (!OptIn.items[i].isRequired)
        return true;
    }
    return false;
  },
  
  acceptAll: function(){
    var m = OptIn.getStorage();
    var i, itm;
    for(i=0; i < OptIn.items.length; i++){
      itm = OptIn.items[i];
      if (!itm.isRequired)
        try{m.setItem('OptIn.concent.'+itm.ident, 'Y');} catch(e){}
    }
    OptIn.hideConsentForm();
    OptIn.closeDraw();
    OptIn.update();
  },
  
  update: function(){
    OptIn.items.forEach(function(itm){
      itm.update();
    });
    if (OptIn.draw){
      OptIn.draw.remove();
      OptIn.draw = null;
      OptIn.addDraw();
    }
    dispatchEvent(OptIn.event);
  },
    
  onAllowedDefault: function(optInType){
    if (!(optInType instanceof OptInType))
      return false;
    var i, e, v;
    var lst = document.getElementsByClassName('OptIn_'+optInType.ident);
    for (i=0; i < lst.length; i++){
      e = lst[i];
      if (v = e.getAttribute('optin_src'))
        e.setAttribute('src', v);
      if (v = e.getAttribute('optin_href'))
        e.setAttribute('href', v);
    }
    optInType.unblockIFrame();
  },
  
  blockIFrame: function(findUrl, replaceUrl, ident){
    var i,itm, lst = document.getElementsByTagName('iframe');
    for (i=0; i<lst.length; i++){
      itm = lst[i];
      if (itm.src.indexOf(findUrl) != -1){
        itm.setAttribute('optin_src', itm.src);
        itm.setAttribute('src', replaceUrl);
        itm.setAttribute('optin', ident);
      }
    }
  },
  
  unblockIFrame: function(ident){
    var i, e, v, lst = document.getElementsByTagName('iframe');
    for(i=0; i<lst.length; i++){
      e = lst[i];
      if (e.getAttribute('optin') == ident){
        if (v = e.getAttribute('optin_src'))
          e.setAttribute('src', v);
        if (v = e.getAttribute('optin_href'))
          e.setAttribute('href', v);
        e.setAttribute('optin', '');
      }
    };
  },
  
  triggerConsentFromFrame: function(){
    window.parent.postMessage('OptIn - FrameConsent', '*');
  },
  
  triggerInfoFromFrame: function(){
    window.parent.postMessage('OptIn - FrameMoreInfo', '*');
  },
  
  handleMessageFromFrame: function(event){
    if (event.source.parent != window)
      return;
    var e = event.source.frameElement || false;
    if (!e)
      return
    if (event.data == 'OptIn - FrameConsent'){
      var ident = e.getAttribute('optin');
      if (!ident)
        return;
      var itm = OptIn.findItemByIdent(ident);
      if (!itm)
        return;
      itm.setConsent(true);
    } else if (event.data == 'OptIn - FrameMoreInfo'){
      document.location = OptIn.readMoreUrl;
    }
  },
  
  buildConsentForm: function(){
    if (OptIn.frmOptInWrap)
      return;
    var i, itm, disabled, html='';
    html += '<div class="OptIn_CloseX" onclick="OptIn.hideConsentForm()">X</div>';
    if (OptIn.shortHTML)
      html += '<p>'+OptIn.shortHTML+'</p>';
    html += '<table>';
    for(i=0; i<OptIn.items.length; i++){
      itm = OptIn.items[i];
      disabled = (itm.isRequired) ? 'disabled' : '';
      html += '<tr><td><input name="'+itm.ident+'" type="checkbox" '+disabled+'/></td><td>'+itm.caption+'</td></tr>';
    }
    html += '</table>';
    html += '<div class="OptIn_ButtonWrapper">';
    if (OptIn.readMoreUrl)
      html += '<div class="OptIn_InfoButton" onclick="document.location=\''+OptIn.readMoreUrl+'\'">learn more</div>';
    html += '<div class="OptIn_ConsentButton" onclick="OptIn.saveConsentForm()">save</div>';
    html += '<div>';
    
    OptIn.frmOptInWrap = document.createElement('div');
    OptIn.frmOptInWrap.className = 'OptIn_ConsentWrapper';
    OptIn.frmOptInWrap.onclick = OptIn.hideConsentForm;
    document.body.appendChild(OptIn.frmOptInWrap);
    
    OptIn.frmOptIn = document.createElement('form');
    OptIn.frmOptIn.name = 'frmOptIn';
    OptIn.frmOptIn.className = 'OptIn_ConsentForm';
    OptIn.frmOptIn.onsubmit = ()=>{return false};
    OptIn.frmOptIn.innerHTML = html;
    document.body.appendChild(OptIn.frmOptIn);
  },
  
  showConsentForm: function(){
    OptIn.buildConsentForm();
    var i, itm, cbx;
    for(i=0; i<OptIn.items.length; i++){
      itm = OptIn.items[i];
      cbx = OptIn.frmOptIn.elements[itm.ident];
      if (!cbx)
        continue;
      cbx.checked = (itm.isRequired) || (OptIn.getConsent(itm.ident) == true);
    }
    OptIn.frmOptInWrap.className = 'OptIn_ConsentWrapper OptIn_Show';
    OptIn.frmOptIn.className = 'OptIn_ConsentForm OptIn_Show';
  },
  
  hideConsentForm: function(){
    if (!OptIn.frmOptInWrap)
      return;
    OptIn.frmOptInWrap.className = 'OptIn_ConsentWrapper';
    OptIn.frmOptIn.className = 'OptIn_ConsentForm';
  },
  
  saveConsentForm: function(){
    if (!OptIn.frmOptIn)
      return;
    OptIn.hideConsentForm();
    var i, itm, cbx;
    for(i=0; i<OptIn.items.length; i++){
      itm = OptIn.items[i];
      cbx = OptIn.frmOptIn.elements[itm.ident];
      if (!cbx)
        continue;
      OptIn.setConsent(itm.ident, cbx.checked);
    }
  },
  
  addDraw: function(){
    if ((OptIn.draw) || (window.parent != window))
      return;
    OptIn.draw = document.createElement('div');
    OptIn.draw.className='OptIn_Draw';
    var i, itm, tick;
    var html = '<table width="100%" cellpadding="0" cellspacing="0"><tr valign="center">';
    html += '<td width="1px" class="OptIn_Drawtabcell"><div class="OptIn_Drawtab" onclick="OptIn.toggleDraw()">privacy</div></td>';
    html += '<td><div class="OptIn_Drawbody">';
    if (OptIn.shortHTML)
      html += '<div class="OptIn_Drawstatement">'+OptIn.shortHTML+'</div>';
    html += '<ul class="OptIn_Drawcolumns">';
    for (i=0; i<OptIn.items.length; i++){
      itm = OptIn.items[i];
      tick = (itm.isRequired || OptIn.getConsent(itm.ident)) ? OptIn.isAllowed : OptIn.isNotAllowed;
      html += '<li class="OptIn_Drawitem">'+tick+'&nbsp;'+itm.caption+'</li>';
    }
    html += '</ul></div></td>';
    html += '<td><div class="OptIn_InfoButton" onclick="OptIn.closeDraw(); OptIn.showConsentForm()">options</div>';
    if (OptIn.hasOptionalItems())
      html += '<div class="OptIn_ConsentButton" onclick="OptIn.acceptAll()">accept all</div>';
    html += '</td></tr></table>';
    OptIn.draw.innerHTML = html;
    document.body.appendChild(OptIn.draw);
  },
  
  closeDraw: function(){
    if (!OptIn.draw)
      return;
    OptIn.draw.className = 'OptIn_Draw';
  },
  
  openDraw: function(){
    if (!OptIn.draw)
      return;
    OptIn.draw.className = 'OptIn_Draw OptIn_Show';
  },
  
  toggleDraw: function(){
    if (!OptIn.draw)
      return;
    if (OptIn.draw.className == 'OptIn_Draw'){
      if (document.body.clientWidth > OptIn.calc1em()*OptIn.minDrawWidthInEm)
        OptIn.openDraw();
      else
        OptIn.showConsentForm();
    } else {
      OptIn.closeDraw();
    }
  },
  
  init: function(){
    OptIn.update();
    if (!OptIn.hasConsentSettings()){
      if ( (OptIn.triggerFirstVisitPopup) 
        && (window.parent == window) 
        && (OptIn.hasOptionalItems()) 
        && (!OptIn.isReadMorePage())
      ){
        var w = OptIn.calc1em();
        if ((OptIn.draw) && (document.body.clientWidth > w*OptIn.minDrawWidthInEm)){
          OptIn.openDraw();
        } else {
          OptIn.showConsentForm();
        }
      }
    }
  }
};

addEventListener('message', OptIn.handleMessageFromFrame);
addEventListener('DOMContentLoaded', OptIn.init);
