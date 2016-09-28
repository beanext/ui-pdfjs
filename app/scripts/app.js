'use strict';

angular.module('uiPdfjsApp', ['bui.pdf']).controller('MainCtrl', function ($scope) {
  var src = 'pdf/example.pdf';
  $scope.pdf = {
    src: src,
    height: angular.element(window).height() + "px"
  };
});
