'use strict';

/**
 * @ngdoc function
 * @name uiPdfjsApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the uiPdfjsApp
 */
angular.module('uiPdfjsApp')
  .controller('MainCtrl', function ($scope) {
    this.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];

    $scope.pdf = {
      src: 'pdf/example.pdf',
      height: angular.element(window).height()+"px"
    };
  });
