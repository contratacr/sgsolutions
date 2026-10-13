// Intercept before Next restores a route and discards unsaved form state.
window.addEventListener("popstate",function(event){
  window.dispatchEvent(new CustomEvent("sg-panel-popstate",{detail:event}));
},true);
