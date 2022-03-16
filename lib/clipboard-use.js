/*页面载入完成后，创建复制按钮*/
/*页面载入完成后，创建复制按钮*/
!function (e, t, a) {
    /* code */
    var initCopyCode = function () {
      var copyHtml = '<button class="btn-copy" data-clipboard-snippet=""><i class="fa fa-clipboard"></i></button>';
      $(".highlight .code pre").before(copyHtml);
      var clipboard = new ClipboardJS('.btn-copy', {
        text: function(trigger) {
            return trigger.nextElementSibling;
        }
       });
        clipboard.on('success', function (e) {
            e.trigger.innerHTML = "<i class='fa fa-clipboard'></i><span>复制成功</span>"
            setTimeout(function () {
                e.trigger.innerHTML = "<i class='fa fa-clipboard'></i><span>复制</span>"
            }, 1000)
        
            e.clearSelection();
        });
        clipboard.on('error', function (e) {
            e.trigger.innerHTML = "<i class='fa fa-clipboard'></i><span>复制失败</span>"
            setTimeout(function () {
                e.trigger.innerHTML = "<i class='fa fa-clipboard'></i><span>复制</span>"
            }, 1000)
            e.clearSelection();
        });
    }
    
    initCopyCode();
  }(window, document);