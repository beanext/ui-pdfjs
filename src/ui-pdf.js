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

  function initPDFJS(callback) {
    var pdfjsSrc = file.path.replace(file.filename, "viewer/pdfjs/pdf.js");
    var exists = false;
    callback = callback || angular.noop;
    angular.forEach(file.scripts, function (script) {
      if (pdfjsSrc === script.src) {
        exists = true;
        return;
      }
    })
    if (!exists) {
      var localeResource = document.createElement("link");
      localeResource.setAttribute("rel", "resource");
      localeResource.setAttribute("type", "application/l10n");
      localeResource.setAttribute("href", file.path.replace(file.filename, "viewer/pdfjs/locale/locale.properties"));
      var script = document.createElement('script');
      script.setAttribute('src', pdfjsSrc);
      var loaded = false;
      script.onload = function () {
        PDFJS.workerSrc = pdfjsSrc.replace(/\.js$/i, '.worker.js');
        if (!loaded) {
          callback();
        }
        loaded = true;
      };
      var container = document.getElementsByTagName('head')[0];
      container.appendChild(localeResource);
      container.appendChild(script);
    } else {
      callback();
    }
  }

  $PDFViewer.$inject = ['$interval'];
  function $PDFViewer($interval) {
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
        height: '=',
        onePage: '=',
        pdfClass: '=',
        notInSecondaryTool: '='
      },
      link: function ($scope, $element, $attrs) {
        $scope.pdfClass = $scope.pdfClass || 'pdfjs';
        $element.children().wrap('<div class="' + $scope.pdfClass + '" style="width: 100%; height: 100%;"></div>');
        $scope.overflowStyle = $scope.onePage ? 'overflow:hidden' : '';
        $scope.secondaryToolbarToggleVisible = $scope.enableFirstPage || $scope.enableLastPage || $scope.enableRotateL || $scope.enableRotateR || $scope.enableHandTool || $scope.enableDocProps;
        $scope.secondaryToolbarSeparators = [];
        $scope.secondaryToolbarSeparators.push(($scope.enableFirstPage || $scope.enableLastPage) && ($scope.enableRotateL || $scope.enableRotateR || $scope.enableHandTool || $scope.enableDocProps));
        $scope.secondaryToolbarSeparators.push(($scope.enableRotateL || $scope.enableRotateR) && ($scope.enableHandTool || $scope.enableDocProps));
        $scope.secondaryToolbarSeparators.push($scope.enableHandTool && $scope.enableDocProps);

        var initialised = false;
        var loaded = {};
        var numLoaded = 0;

        function reset() {
          $scope.outerContainerStyle = '';
          if ($scope.width !== undefined) {
            $scope.outerContainerStyle += 'width:' + $scope.width;
          }
          if ($scope.height !== undefined) {
            $scope.outerContainerStyle += 'height:' + $scope.height;
          }
        }

        var webViewerResize = function (evt) {
          if (initialised) {
            var pdfViewer = PDFViewerApplication.pdfViewer;
            if (pdfViewer._pages.length) {
              $scope.height = Math.floor(pdfViewer._pages[0].height + 26) + 'px';
              reset();
            }
          }
        }

        window.addEventListener('resize', function (evt) {
          webViewerResize(evt)
        })
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

        var poller;

        $element.on('$destroy', function () {
          $interval.cancel(poller);
        });

        $scope.$watch(function () {
          return $attrs.src;
        }, function () {
          if (!$attrs.src) return;
          initPDFJS(function () {
            PDFJS.webViewerLoad($attrs.src);
            poller = $interval(function () {
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
              webViewerResize();
            }, 200);
          })
        });
      }
    };
  }

  var module = angular.module('bui.pdf', []).directive('buiPdf', $PDFViewer)

  module.provider('pdfjsViewerConfig', function () {
    var config = {
      workerSrc: null,
      cmapDir: null,
      imageResourcesPath: null,
      disableWorker: false
    };

    this.setWorkerSrc = function (src) {
      config.workerSrc = src;
    };

    this.setCmapDir = function (dir) {
      config.cmapDir = dir;
    };

    this.setImageDir = function (dir) {
      config.imageDir = dir;
    };

    this.disableWorker = function (value) {
      if (typeof value === 'undefined') value = true;
      config.disableWorker = value;
    }

    this.$get = function () {
      return config;
    }
  });

  module.run(['pdfjsViewerConfig', function (pdfjsViewerConfig) {
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
  module.run(["$templateCache", function ($templateCache) {
    $templateCache.put("src/viewer/pdfjs/viewer.html", "<div id=\"outerContainer\" style=\"{{outerContainerStyle}}\"><div id=\"sidebarContainer\"><div id=\"toolbarSidebar\"><div class=\"splitToolbarButton toggled\"><button id=\"viewThumbnail\" class=\"toolbarButton group toggled\" title=\"Show Thumbnails\" tabindex=\"2\" data-l10n-id=\"thumbs\"><span data-l10n-id=\"thumbs_label\">Thumbnails</span></button><button id=\"viewOutline\" class=\"toolbarButton group\" title=\"Show Document Outline\" tabindex=\"3\" data-l10n-id=\"outline\"><span data-l10n-id=\"outline_label\">Document Outline</span></button><button id=\"viewAttachments\" class=\"toolbarButton group\" title=\"Show Attachments\" tabindex=\"4\" data-l10n-id=\"attachments\"><span data-l10n-id=\"attachments_label\">Attachments</span></button></div></div><div id=\"sidebarContent\"><div id=\"thumbnailView\"></div><div id=\"outlineView\" class=\"hidden\"></div><div id=\"attachmentsView\" class=\"hidden\"></div></div></div><div id=\"mainContainer\"><div ng-show=\"enableSearch\" class=\"ng-hide findbar hidden doorHanger hiddenSmallView\" id=\"findbar\"><label for=\"findInput\" class=\"toolbarLabel\" data-l10n-id=\"find_label\">Find:</label><input id=\"findInput\" class=\"toolbarField\" tabindex=\"91\"><div class=\"splitToolbarButton\"><button class=\"toolbarButton findPrevious\" title=\"\" id=\"findPrevious\" tabindex=\"92\" data-l10n-id=\"find_previous\"><span data-l10n-id=\"find_previous_label\">Previous</span></button><div class=\"splitToolbarButtonSeparator\"></div><button class=\"toolbarButton findNext\" title=\"\" id=\"findNext\" tabindex=\"93\" data-l10n-id=\"find_next\"><span data-l10n-id=\"find_next_label\">Next</span></button></div><input type=\"checkbox\" id=\"findHighlightAll\" class=\"toolbarField\"><label for=\"findHighlightAll\" class=\"toolbarLabel\" tabindex=\"94\" data-l10n-id=\"find_highlight\">Highlight all</label><input type=\"checkbox\" id=\"findMatchCase\" class=\"toolbarField\"><label for=\"findMatchCase\" class=\"toolbarLabel\" tabindex=\"95\" data-l10n-id=\"find_match_case_label\">Match case</label><span id=\"findMsg\" class=\"toolbarLabel\"></span></div><div id=\"secondaryToolbar\" class=\"secondaryToolbar hidden doorHangerRight\"><div id=\"secondaryToolbarButtonContainer\"><button id=\"secondaryPresentationMode\" ng-show=\"enableFullscreen\" class=\"ng-hide secondaryToolbarButton presentationMode visibleLargeView\" title=\"Switch to Presentation Mode\" tabindex=\"51\" data-l10n-id=\"presentation_mode\"><span data-l10n-id=\"presentation_mode_label\">Presentation Mode</span></button><button id=\"secondaryOpenFile\" ng-show=\"enableOpenFile\" class=\"ng-hide secondaryToolbarButton openFile visibleLargeView\" title=\"Open File\" tabindex=\"52\" data-l10n-id=\"open_file\"><span data-l10n-id=\"open_file_label\">Open</span></button><button id=\"secondaryPrint\" ng-show=\"enablePrint\" class=\"ng-hide secondaryToolbarButton print visibleMediumView\" title=\"Print\" tabindex=\"53\" data-l10n-id=\"print\"><span data-l10n-id=\"print_label\">Print</span></button><button id=\"secondaryDownload\" ng-show=\"enableDownload\" class=\"ng-hide secondaryToolbarButton download visibleMediumView\" title=\"Download\" tabindex=\"54\" data-l10n-id=\"download\"><span data-l10n-id=\"download_label\">Download</span></button><a href=\"#\" id=\"secondaryViewBookmark\" ng-show=\"enableBookmark\" class=\"ng-hide secondaryToolbarButton bookmark visibleSmallView\" title=\"Current view (copy or open in new window)\" tabindex=\"55\" data-l10n-id=\"bookmark\"><span data-l10n-id=\"bookmark_label\">Current View</span></a><div ng-show=\"enableFullscreen || enableOpenFile || enablePrint || enableDownload || enableBookmark\" class=\"ng-hide horizontalToolbarSeparator visibleLargeView\"></div><button id=\"firstPage\" ng-show=\"enableFirstPage\" class=\"ng-hide secondaryToolbarButton firstPage\" title=\"Go to First Page\" tabindex=\"56\" data-l10n-id=\"first_page\"><span data-l10n-id=\"first_page_label\">Go to First Page</span></button><button id=\"lastPage\" ng-show=\"enableLastPage\" class=\"ng-hide secondaryToolbarButton lastPage\" title=\"Go to Last Page\" tabindex=\"57\" data-l10n-id=\"last_page\"><span data-l10n-id=\"last_page_label\">Go to Last Page</span></button><div ng-show=\"secondaryToolbarSeparators[0]\" class=\"ng-hide horizontalToolbarSeparator\"></div><button id=\"pageRotateCw\" ng-if=\"!notInSecondaryTool\" ng-show=\"enableRotateR\" class=\"ng-hide secondaryToolbarButton rotateCw\" title=\"Rotate Clockwise\" tabindex=\"58\" data-l10n-id=\"page_rotate_cw\"><span data-l10n-id=\"page_rotate_cw_label\">Rotate Clockwise</span></button><button id=\"pageRotateCcw\" ng-show=\"enableRotateL\" ng-if=\"!notInSecondaryTool\" class=\"ng-hide secondaryToolbarButton rotateCcw\" title=\"Rotate Counterclockwise\" tabindex=\"59\" data-l10n-id=\"page_rotate_ccw\"><span data-l10n-id=\"page_rotate_ccw_label\">Rotate Counterclockwise</span></button><div ng-show=\"secondaryToolbarSeparators[1]\" class=\"ng-hide horizontalToolbarSeparator\"></div><button id=\"toggleHandTool\" ng-show=\"enableHandTool\" class=\"ng-hide secondaryToolbarButton handTool\" title=\"Enable hand tool\" tabindex=\"60\" data-l10n-id=\"hand_tool_enable\"><span data-l10n-id=\"hand_tool_enable_label\">Enable hand tool</span></button><div ng-show=\"secondaryToolbarSeparators[2]\" class=\"ng-hide horizontalToolbarSeparator\"></div><button id=\"documentProperties\" class=\"secondaryToolbarButton documentProperties\" title=\"Document Properties…\" tabindex=\"61\" data-l10n-id=\"document_properties\"><span data-l10n-id=\"document_properties_label\">Document Properties…</span></button></div></div><div class=\"toolbar\"><div id=\"toolbarContainer\"><div id=\"toolbarViewer\"><div id=\"toolbarViewerLeft\"><button id=\"sidebarToggle\" ng-show=\"enableSidebar\" class=\"ng-hide toolbarButton\" title=\"Toggle Sidebar\" tabindex=\"11\" data-l10n-id=\"toggle_sidebar\"><span data-l10n-id=\"toggle_sidebar_label\">Toggle Sidebar</span></button><div class=\"toolbarButtonSpacer\"></div><button id=\"viewFind\" ng-show=\"enableSearch\" class=\"ng-hide toolbarButton group hiddenSmallView\" title=\"Find in Document\" tabindex=\"12\" data-l10n-id=\"findbar\"><span data-l10n-id=\"findbar_label\">Find</span></button><div class=\"ng-hide splitToolbarButton\" ng-show=\"enablePageUp || enablePageDown\"><button ng-show=\"enablePageUp\" class=\"ng-hide toolbarButton pageUp\" title=\"Previous Page\" id=\"previous\" tabindex=\"13\" data-l10n-id=\"previous\"><span data-l10n-id=\"previous_label\">Previous</span></button><div class=\"ng-hide splitToolbarButtonSeparator\" ng-show=\"enablePageUp && enablePageDown\"></div><button ng-show=\"enablePageDown\" class=\"ng-hide toolbarButton pageDown\" title=\"Next Page\" id=\"next\" tabindex=\"14\" data-l10n-id=\"next\"><span data-l10n-id=\"next_label\">Next</span></button></div><label id=\"pageNumberLabel\" ng-show=\"numPagesVisible || enableNumPage\" class=\"ng-hide toolbarLabel\" for=\"pageNumber\" data-l10n-id=\"page_label\">Page:</label><input type=\"number\" id=\"pageNumber\" ng-show=\"enableNumPage\" class=\"ng-hide toolbarField pageNumber\" value=\"1\" size=\"4\" min=\"1\" tabindex=\"15\"><span id=\"numPages\" ng-show=\"numPagesVisible\" class=\"ng-hide toolbarLabel\"></span></div><div id=\"toolbarViewerRight\"><button id=\"presentationMode\" ng-show=\"enableFullscreen\" class=\"ng-hide toolbarButton presentationMode hiddenLargeView\" title=\"Switch to Presentation Mode\" tabindex=\"31\" data-l10n-id=\"presentation_mode\"><span data-l10n-id=\"presentation_mode_label\">Presentation Mode</span></button><button id=\"openFile\" ng-show=\"enableOpenFile\" class=\"ng-hide toolbarButton openFile hiddenLargeView\" title=\"Open File\" tabindex=\"32\" data-l10n-id=\"open_file\"><span data-l10n-id=\"open_file_label\">Open</span></button><button id=\"print\" ng-show=\"enablePrint\" class=\"ng-hide toolbarButton print hiddenMediumView\" title=\"Print\" tabindex=\"33\" data-l10n-id=\"print\"><span data-l10n-id=\"print_label\">Print</span></button><button id=\"download\" ng-show=\"enableDownload\" class=\"ng-hide toolbarButton download hiddenMediumView\" title=\"Download\" tabindex=\"34\" data-l10n-id=\"download\"><span data-l10n-id=\"download_label\">Download</span></button><a href=\"#\" id=\"viewBookmark\" ng-show=\"enableBookmark\" class=\"ng-hide toolbarButton bookmark hiddenSmallView\" title=\"Current view (copy or open in new window)\" tabindex=\"35\" data-l10n-id=\"bookmark\"><span data-l10n-id=\"bookmark_label\">Current View</span></a><div ng-show=\"(enableFullscreen || enableOpenFile || enablePrint || enableDownload || enableBookmark) && secondaryToolbarToggleVisible\"                 class=\"ng-hide verticalToolbarSeparator hiddenSmallView\"></div><button id=\"secondaryToolbarToggle\" ng-show=\"secondaryToolbarToggleVisible\"                    class=\"ng-hide toolbarButton\" title=\"Tools\" tabindex=\"36\" data-l10n-id=\"tools\"><span data-l10n-id=\"tools_label\">Tools</span></button></div><div class=\"outerCenter\"><div class=\"innerCenter\" id=\"toolbarViewerMiddle\"><div ng-show=\"enableZoomIn || enableZoomOut || enableRotateR || enableRotateL\" class=\"ng-hide splitToolbarButton\"><button id=\"zoomOut\" ng-show=\"enableZoomOut\" class=\"ng-hide toolbarButton zoomOut\" title=\"Zoom Out\" tabindex=\"21\" data-l10n-id=\"zoom_out\"><span data-l10n-id=\"zoom_out_label\">Zoom Out</span></button><div ng-show=\"enableZoomIn && enableZoomOut\" class=\"ng-hide splitToolbarButtonSeparator\"></div><button id=\"zoomIn\" ng-show=\"enableZoomIn\" class=\"ng-hide toolbarButton zoomIn\" title=\"Zoom In\" tabindex=\"22\" data-l10n-id=\"zoom_in\"><span data-l10n-id=\"zoom_in_label\">Zoom In</span></button><button id=\"pageRotateCcw\" ng-show=\"enableRotateL\" ng-if=\"notInSecondaryTool\" class=\"toolbarButton rotateCcw\" title=\"Rotate Counterclockwise\" tabindex=\"25\" data-l10n-id=\"page_rotate_ccw\"><span data-l10n-id=\"page_rotate_ccw_label\">Rotate Counterclockwise</span></button><button id=\"pageRotateCw\" ng-if=\"notInSecondaryTool\" ng-show=\"enableRotateR\" class=\"toolbarButton rotateCw\" title=\"Rotate Clockwise\" tabindex=\"24\" data-l10n-id=\"page_rotate_cw\"><span data-l10n-id=\"page_rotate_cw_label\">Rotate Clockwise</span></button></div><span id=\"scaleSelectContainer\" ng-show=\"enableScale\" class=\"ng-hide dropdownToolbarButton\"><select id=\"scaleSelect\" title=\"Zoom\" tabindex=\"23\" data-l10n-id=\"zoom\"><option id=\"pageAutoOption\" title=\"\" value=\"auto\" selected=\"selected\" data-l10n-id=\"page_scale_auto\">Automatic Zoom</option><option id=\"pageActualOption\" title=\"\" value=\"page-actual\" data-l10n-id=\"page_scale_actual\">Actual Size</option><option id=\"pageFitOption\" title=\"\" value=\"page-fit\" data-l10n-id=\"page_scale_fit\">Fit Page</option><option id=\"pageWidthOption\" title=\"\" value=\"page-width\" data-l10n-id=\"page_scale_width\">Full Width</option><option id=\"customScaleOption\" title=\"\" value=\"custom\"></option><option title=\"\" value=\"0.5\" data-l10n-id=\"page_scale_percent\" data-l10n-args='{ \"scale\": 50 }'>50%</option><option title=\"\" value=\"0.75\" data-l10n-id=\"page_scale_percent\" data-l10n-args='{ \"scale\": 75 }'>75%</option><option title=\"\" value=\"1\" data-l10n-id=\"page_scale_percent\" data-l10n-args='{ \"scale\": 100 }'>100%</option><option title=\"\" value=\"1.25\" data-l10n-id=\"page_scale_percent\" data-l10n-args='{ \"scale\": 125 }'>125%</option><option title=\"\" value=\"1.5\" data-l10n-id=\"page_scale_percent\" data-l10n-args='{ \"scale\": 150 }'>150%</option><option title=\"\" value=\"2\" data-l10n-id=\"page_scale_percent\" data-l10n-args='{ \"scale\": 200 }'>200%</option><option title=\"\" value=\"3\" data-l10n-id=\"page_scale_percent\" data-l10n-args='{ \"scale\": 300 }'>300%</option><option title=\"\" value=\"4\" data-l10n-id=\"page_scale_percent\" data-l10n-args='{ \"scale\": 400 }'>400%</option></select></span></div></div></div><div id=\"loadingBar\"><div class=\"progress\"><div class=\"glimmer\"></div></div></div></div></div><menu type=\"context\" id=\"viewerContextMenu\"><menuitem id=\"contextFirstPage\" label=\"First Page\"                data-l10n-id=\"first_page\"></menuitem><menuitem id=\"contextLastPage\" label=\"Last Page\"                data-l10n-id=\"last_page\"></menuitem><menuitem id=\"contextPageRotateCw\" label=\"Rotate Clockwise\"                data-l10n-id=\"page_rotate_cw\"></menuitem><menuitem id=\"contextPageRotateCcw\" label=\"Rotate Counter-Clockwise\"                data-l10n-id=\"page_rotate_ccw\"></menuitem></menu><div id=\"viewerContainer\" style=\"{{overflowStyle}}\" tabindex=\"0\"><div id=\"viewer\" class=\"pdfViewer\"></div></div><div id=\"errorWrapper\" hidden='true'><div id=\"errorMessageLeft\"><span id=\"errorMessage\"></span><button id=\"errorShowMore\" data-l10n-id=\"error_more_info\">          More Information</button><button id=\"errorShowLess\" data-l10n-id=\"error_less_info\" hidden='true'>          Less Information</button></div><div id=\"errorMessageRight\"><button id=\"errorClose\" data-l10n-id=\"error_close\">          Close</button></div><div class=\"clearBoth\"></div><textarea id=\"errorMoreInfo\" hidden='true' readonly=\"readonly\"></textarea></div></div><div id=\"overlayContainer\" class=\"hidden\"><div id=\"passwordOverlay\" class=\"container hidden\"><div class=\"dialog\"><div class=\"row\"><p id=\"passwordText\" data-l10n-id=\"password_label\">Enter the password to open this PDF file:</p></div><div class=\"row\"><input type=\"password\" id=\"password\" class=\"toolbarField\" /></div><div class=\"buttonRow\"><button id=\"passwordCancel\" class=\"overlayButton\"><span data-l10n-id=\"password_cancel\">Cancel</span></button><button id=\"passwordSubmit\" class=\"overlayButton\"><span data-l10n-id=\"password_ok\">OK</span></button></div></div></div><div id=\"documentPropertiesOverlay\" class=\"container hidden\"><div class=\"dialog\"><div class=\"row\"><span data-l10n-id=\"document_properties_file_name\">File name:</span><p id=\"fileNameField\">-</p></div><div class=\"row\"><span data-l10n-id=\"document_properties_file_size\">File size:</span><p id=\"fileSizeField\">-</p></div><div class=\"separator\"></div><div class=\"row\"><span data-l10n-id=\"document_properties_title\">Title:</span><p id=\"titleField\">-</p></div><div class=\"row\"><span data-l10n-id=\"document_properties_author\">Author:</span><p id=\"authorField\">-</p></div><div class=\"row\"><span data-l10n-id=\"document_properties_subject\">Subject:</span><p id=\"subjectField\">-</p></div><div class=\"row\"><span data-l10n-id=\"document_properties_keywords\">Keywords:</span><p id=\"keywordsField\">-</p></div><div class=\"row\"><span data-l10n-id=\"document_properties_creation_date\">Creation Date:</span><p id=\"creationDateField\">-</p></div><div class=\"row\"><span data-l10n-id=\"document_properties_modification_date\">Modification Date:</span><p id=\"modificationDateField\">-</p></div><div class=\"row\"><span data-l10n-id=\"document_properties_creator\">Creator:</span><p id=\"creatorField\">-</p></div><div class=\"separator\"></div><div class=\"row\"><span data-l10n-id=\"document_properties_producer\">PDF Producer:</span><p id=\"producerField\">-</p></div><div class=\"row\"><span data-l10n-id=\"document_properties_version\">PDF Version:</span><p id=\"versionField\">-</p></div><div class=\"row\"><span data-l10n-id=\"document_properties_page_count\">Page Count:</span><p id=\"pageCountField\">-</p></div><div class=\"buttonRow\"><button id=\"documentPropertiesClose\" class=\"overlayButton\"><span data-l10n-id=\"document_properties_close\">Close</span></button></div></div></div></div></div>");
  }])
}));
