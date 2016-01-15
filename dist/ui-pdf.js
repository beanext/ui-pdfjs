if (typeof module !== "undefined" && typeof exports !== "undefined" && module.exports === exports) {
  module.exports = 'bui.pdf';
}
(function (root, factory) {
  factory(angular);
}(this, function (angular) {
  'use strict';

  // === get current script file ===
  var file = {};
  file.scripts = document.querySelectorAll('script[src]');
  file.path = file.scripts[file.scripts.length - 1].src;
  file.filename = getFileName(file.path);
  file.folder = getLocation(file.path).pathname.replace(file.filename, '');

  function getFileName(url) {
    var anchor = url.indexOf('#');
    var query = url.indexOf('?');
    var end = Math.min(anchor > 0 ? anchor : url.length, query > 0 ? query : url.length);
    return url.substring(url.lastIndexOf('/', end) + 1, end);
  }

  function getLocation(href) {
    var location = document.createElement("a");
    location.href = href;

    if (!location.host) location.href = location.href; // Weird assigment

    return location;
  }

  $PDFViewer.$inject = ['$interval'];
  function $PDFViewer(   $interval ){
    return {
      templateUrl: 'src/viewer/pdfjs/viewer.html',
      restrict: 'E',
      scope: {
        onInit: '&',
        onPageLoad: '&',
        scale: '=',
        enableOpenFile: '=',
        enableDownload: '=',
        enablePrint: '=',
        enableFullscreen: '=',
        enableBookmark: '=',
        enableFirstPage: '=',
        enableLastPage: '=',
        enableRotateL: '=',
        enableRotateR: '=',
        enableHandTool: '=',
        enableDocProps: '=',
        enableScale: '=',
        enableZoomOut: '=',
        enableZoomIn: '=',
        numPagesVisible: '=',
        enableNumPage: '=',
        enablePageDown: '=',
        enablePageUp: '=',
        enableSidebar: '=',
        enableSearch: '=',
        width: '=',
        height: '='
      },
      link: function ($scope, $element, $attrs) {
        $element.children().wrap('<div class="pdfjs" style="width: 100%; height: 100%;"></div>');
        $scope.outerContainerStyle = '';
        if($scope.width !== undefined) {
          $scope.outerContainerStyle += 'width:' + $scope.width;
        }
        if($scope.height !== undefined) {
          $scope.outerContainerStyle += 'height:' + $scope.height;
        }

        /*$scope.enableOpenFile = true;
        $scope.enableDownload = true;
        $scope.enablePrint = true;
        $scope.enableFullscreen = true;
        $scope.enableBookmark = true;
        $scope.enableRotateL = true;
        $scope.enableRotateR = true;
        $scope.enableHandTool = true;
        $scope.enableDocProps = true;
        $scope.enableScale = true;
        $scope.enableZoomOut = true;
        $scope.enableZoomIn = true;
        $scope.numPagesVisible = true;
        $scope.enableNumPage = true;
        $scope.enablePageDown = true;
        $scope.enablePageUp = true;
        $scope.enableSidebar = true;
        $scope.enableSearch = true;
        $scope.enableFirstPage = true;
        $scope.enableLastPage = true;*/

        $scope.secondaryToolbarToggleVisible = $scope.enableFirstPage || $scope.enableLastPage || $scope.enableRotateL || $scope.enableRotateR || $scope.enableHandTool || $scope.enableDocProps;
        $scope.secondaryToolbarSeparators = [];
        $scope.secondaryToolbarSeparators.push(($scope.enableFirstPage || $scope.enableLastPage) && ($scope.enableRotateL || $scope.enableRotateR || $scope.enableHandTool || $scope.enableDocProps));
        $scope.secondaryToolbarSeparators.push(($scope.enableRotateL || $scope.enableRotateR) && ($scope.enableHandTool || $scope.enableDocProps));
        $scope.secondaryToolbarSeparators.push($scope.enableHandTool && $scope.enableDocProps);
        console.log($scope.secondaryToolbarSeparators)

        var initialised = false;
        var loaded = {};
        var numLoaded = 0;

        function onPdfInit() {
          initialised = true;

          if ($attrs.removeMouseListeners === "true") {
            window.removeEventListener('DOMMouseScroll', handleMouseWheel);
            window.removeEventListener('mousewheel', handleMouseWheel);

            var pages = document.querySelectorAll('.page');
            angular.forEach(pages, function (page) {
              angular.element(page).children().css('pointer-events', 'none');
            });
          }
          if ($scope.onInit) $scope.onInit();
        }

        var poller = $interval(function () {
          var pdfViewer = PDFViewerApplication.pdfViewer;

          if (pdfViewer) {
            if ($scope.scale !== pdfViewer.currentScale) {
              loaded = {};
              numLoaded = 0;
              $scope.scale = pdfViewer.currentScale;
            }
          } else {
            console.warn("PDFViewerApplication.pdfViewer is not set");
          }

          var pages = document.querySelectorAll('.page');
          angular.forEach(pages, function (page) {
            var element = angular.element(page);
            var pageNum = element.data('page-number');

            if (!element.data('loaded')) {
              delete loaded[pageNum];
              return;
            }

            if (pageNum in loaded) return;

            if (!initialised) onPdfInit();

            if ($scope.onPageLoad) {
              if ($scope.onPageLoad({page: pageNum}) === false) return;
            }

            loaded[pageNum] = true;
            numLoaded++;
          });
        }, 200);

        $element.on('$destroy', function() {
          $interval.cancel(poller);
        });

        $scope.$watch(function () {
          return $attrs.src;
        }, function () {
          if (!$attrs.src) return;
          PDFJS.webViewerLoad($attrs.src);
        });
      }
    };
  }

  var module = angular.module('bui.pdf', []).directive('buiPdf', $PDFViewer)

  module.provider('pdfjsViewerConfig', function() {
    var config = {
      workerSrc: null,
      cmapDir: null,
      imageResourcesPath: null,
      disableWorker: false
    };

    this.setWorkerSrc = function(src) {
      config.workerSrc = src;
    };

    this.setCmapDir = function(dir) {
      config.cmapDir = dir;
    };

    this.setImageDir = function(dir) {
      config.imageDir = dir;
    };

    this.disableWorker = function(value) {
      if (typeof value === 'undefined') value = true;
      config.disableWorker = value;
    }

    this.$get = function() {
      return config;
    }
  });

  module.run(['pdfjsViewerConfig', function(pdfjsViewerConfig) {
    if (pdfjsViewerConfig.workerSrc) {
      PDFJS.workerSrc = pdfjsViewerConfig.workerSrc;
    }

    if (pdfjsViewerConfig.cmapDir) {
      PDFJS.cMapUrl = pdfjsViewerConfig.cmapDir;
    }

    if (pdfjsViewerConfig.imageDir) {
      PDFJS.imageResourcesPath = pdfjsViewerConfig.imageDir;
    }

    if (pdfjsViewerConfig.disableWorker) {
      PDFJS.disableWorker = true;
    }
  }]);
}));
