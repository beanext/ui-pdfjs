'use strict';

angular.module('uiPdfjsApp', ['bui.pdf']).controller('MainCtrl', function ($scope) {
  $scope.pdf = {
    src: 'pdf/example.pdf',
    height: angular.element(window).height() + "px"
  };
});
