(function(){
  var app = document.querySelector('#app').__vue__;
  var out = [];
  var walk = function(c, depth){
    if (depth > 7) return;
    var d = c.$data || {};
    var keys = Object.keys(d);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var v = d[k];
      try {
        var s = JSON.stringify(v);
        if (s && (s.indexOf('\\u067e\\u0633\\u062a\\u0647') > -1 || s.indexOf('پسته') > -1)) {
          out.push(c.$options.name + ' :: ' + k + ' => ' + s.substring(0, 600));
        }
      } catch (e) {}
    }
    var ch = c.$children || [];
    for (var j = 0; j < ch.length; j++) walk(ch[j], depth + 1);
  };
  walk(app, 0);
  return out.length ? out.join('\n\n') : 'NOT FOUND in $data';
})()
