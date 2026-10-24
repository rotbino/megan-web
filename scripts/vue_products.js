(function(){
  var app = document.querySelector('#app').__vue__;
  var out = [];
  var walk = function(c, depth){
    if (depth > 7) return;
    var d = c.$data || {};
    if (d.products && d.products.length) {
      out.push('TOTAL PRODUCTS: ' + d.products.length);
      out.push('FIRST PRODUCT FULL: ' + JSON.stringify(d.products[0]));
      if (d.products[1]) out.push('SECOND PRODUCT FULL: ' + JSON.stringify(d.products[1]));
    }
    var ch = c.$children || [];
    for (var j = 0; j < ch.length; j++) walk(ch[j], depth + 1);
  };
  walk(app, 0);
  return out.length ? out.join('\n\n') : 'NOT FOUND';
})()
