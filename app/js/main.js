"use strict";

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

;

(function () {
  'use strict';

  var $carts = $('[js-cart]');

  if ($carts.length) {
    $carts.each(function () {
      var $cart = $(this);

      var clickHandler = function clickHandler(event) {
        event.stopPropagation(); // Remove event hoisting 

        var $list = $cart.find('[js-cart-list]');
        $cart.toggleClass('is-open');
        $list.slideToggle();
      };

      $(document).on('click.open.popup', '[js-cart-open]', clickHandler);
      $(document).on('click.close.popup', '[js-cart-close]', clickHandler);
      /* An event handler to control a click outside the cart area. */

      $(document).on('click.outside.popup', function (event) {
        event.stopPropagation();

        if (!$cart.is(event.target) && $cart.has(event.target).length === 0) {
          var $list = $cart.find('[js-cart-list]');
          $cart.removeClass('is-open');
          $list.slideUp();
        }
      });
    });
  }
})();

;

(function () {
  'use strict';

  var $toggles = $('.js-categories-toggle');

  if ($toggles.length) {
    var $list = $('.js-categories-nested-list');
    $toggles.each(function () {
      var $toggle = $(this);
      var $parent = $toggle.parent();

      function clickHandler() {
        $list.slideToggle();
        $parent.toggleClass('is-active');
      }

      $toggle.off('click').on('click', clickHandler);
    });
  }
})();

;

(function () {
  var $checkout = $('.js-checkout');

  if ($checkout.length) {
    var $startBtn = $('.js-checkout-start-order');
    $startBtn.on('click', function () {
      var $firstCheckoutInput = $('.js-checkout-start-focus');
      $([document.documentElement, document.body]).animate({
        scrollTop: $firstCheckoutInput.offset().top - $('.header-mid').height() * 2.5 //Magic factor in order to look beautiful the element to which we scroll the page

      }, 1000);
      $firstCheckoutInput.focus();
    });
    /* The part of the code that is responsible for the changes in the types of delivery and further consequences */

    var $types = $('.js-checkout-radio input');
    $types.each(function () {
      var $type = $(this);
      var $map = $checkout.find('.js-chekout-map');
      var $form = $checkout.find('.js-checkout-form-part');
      $type.on('change', function () {
        var type = $type.val();

        if (type === 'byhimself') {
          $map.removeClass('is-hidden');
          $form.addClass('is-hidden');
          renderCurrentItem(window.companies[type].sdek); //default view

          renderList(window.companies[type], $('.js-render-list-items'), renderSelectItem);
          initSelects(window.companies[type]);
          addNewPlacemarksAndHandlers();
          return;
        }

        if (type === 'courier') {
          $map.addClass('is-hidden');
          $form.removeClass('is-hidden');
          renderCurrentItem(window.companies[type].sdek); //default view

          renderList(window.companies[type], $('.js-render-list-items'), renderSelectItem);
          initSelects(window.companies[type]);
          return;
        }

        if (type === 'postoffice') {
          $map.addClass('is-hidden');
          $form.removeClass('is-hidden');
          renderCurrentItem(window.companies[type].pochtarf); //default view

          renderList(window.companies[type], $('.js-render-list-items'), renderSelectItem);
          initSelects(window.companies[type]);
          return;
        }
      });
    });
    /* Rendering parts of select in DOM Element */

    var renderSelectItem = function renderSelectItem(company, $placeForRender) {
      var checked = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
      var logo = company.logo,
          title = company.title,
          value = company.value,
          deliveryTime = company.deliveryTime,
          cost = company.cost;
      var $parent = $('.js-fake-select-ajax');
      $parent.remove('is-empty');
      var template = $('.js-select-item-template').html();
      var $item = $(template).clone();
      /* Modify template */

      $item.find('.js-select-radio').prop('value', value);

      if (checked) {
        $item.find('.js-select-radio').prop('checked', true);
      }

      $item.find('.js-select-item-image').attr('src', "".concat(logo));
      if (title) $item.find('.js-select-item-title').text(title);
      $item.find('.js-select-item-deliveryTime').text(deliveryTime);
      $item.find('.js-select-item-price').text(cost);
      $placeForRender.append($item);
    };
    /* Special function for re-render Checked Item */


    var renderCurrentItem = function renderCurrentItem(_ref) {
      var selectItem = _ref.selectItem,
          streets = _ref.streets;
      var $placeForRender = $('.js-render-currentItem');
      $placeForRender.empty();
      renderSelectItem(selectItem, $placeForRender, 'checked');
      if (!streets === undefined) return; // in json there is no such field

      renderList(streets, $('.js-map-items'), renderItemsInMap);
    };

    var renderList = function renderList(items, $placeForRender, renderFunction) {
      var count = 0;
      /* The parameter can be both an object and an array. The function renders select elements and a list of addresses near the map. */

      $placeForRender.empty();
      $placeForRender.removeClass('is-open');

      if (Array.isArray(items)) {
        for (var i = 0; i < items.length; i++) {
          count++;
          renderFunction(items[i], $placeForRender, count);
        }
      } else {
        for (var company in items) {
          if (items[company].selectItem.value === 'pochtarf') return; // pochtarf does not have a drop-down list.

          renderFunction(items[company].selectItem, $placeForRender);
        }
      }
    };
    /* When you click on any element in fake select, replace the previously selected element. Visually! */


    var replaceSelectedItem = function replaceSelectedItem($item, $placeForRender) {
      $placeForRender.empty();
      $placeForRender.append($item.clone(true));
    };
    /* Add listener for items */


    var selectItemHandler = function selectItemHandler($select, companies) {
      var $list = $select.find('.detailed-select__list');
      var listLength = $list.children().length;
      var $items = $select.find('.detailed-select__item');

      if (listLength) {
        $select.addClass('dropdown');
        new PerfectScrollbar('.detailed-select__list', {
          wheelPropagation: false
        }); // update custom scroll
      } else {
        $select.removeClass('dropdown');
      }

      $items.each(function () {
        var $item = $(this);
        var $placeForRender = $select.find('.detailed-select__current');
        var $radio = $item.find('.js-select-radio');
        var radioVal = $radio.val();
        $item.off('click.select').on('click.select', function () {
          $radio.prop('checked', true);
          if (!listLength) return; // There is no need to open a blank sheet and do not need to read data for rendering addresses

          $select.toggleClass('is-open');
          $list.toggleClass('is-open');

          if (!($placeForRender.find('input').val() === radioVal)) {
            replaceSelectedItem($item, $placeForRender);

            if (companies[radioVal]) {
              renderList(companies[radioVal].streets, $('.js-map-items'), renderItemsInMap);
              addNewPlacemarksAndHandlers();
            }
          }
        });
      });
    };
    /* Add listener for items */


    var initSelects = function initSelects(companies) {
      //{{...}, {...}, {...}}
      var $selects = $('.js-fake-select');
      $selects.each(function () {
        var $select = $(this);
        selectItemHandler($select, companies);
      });
    };
    /* Display addresses near the map */


    var renderItemsInMap = function renderItemsInMap(_ref2, $placeForRender, count) {
      var logo = _ref2.logo,
          title = _ref2.title,
          deliveryTime = _ref2.deliveryTime,
          coordinates = _ref2.coordinates;
      var template = $('.js-select-map-item-template').html();
      var $item = $(template).clone();
      var $radio = $item.find('.js-select-item-radio');
      if (count === 1) $radio.prop('checked', true); //default checked

      $radio.attr('id', count);
      $radio.attr('data-title', title);
      $radio.attr('data-deliveryTime', deliveryTime);
      $radio.attr('data-coordinates', coordinates);
      $radio.prop('value', title);
      $item.find('.js-select-item-image').attr('src', "".concat(logo));
      $item.find('.js-select-item-title').text(title);
      $item.find('.js-select-item-deliveryTime').text(deliveryTime);
      $placeForRender.append($item);
    };
    /* We get the coordinates through the date attribute in the format: 'str, str'. 
      We need an array in the format: [num, num] */


    var convertStringsToNumbersInArray = function convertStringsToNumbersInArray(str) {
      var result = str.split(',').map(function (item) {
        return +item;
      });
      return result;
    };
    /* The function collects all the coordinates in an array, then to pass them into a function to display on the map */


    var collectPins = function collectPins() {
      var $radios = $('.js-select-map-radio');
      var result = []; //final array with ALL coordinates

      $radios.each(function () {
        var $radio = $(this);
        var id = $radio.attr('id');
        var title = $radio.data('title');
        var deliveryTime = $radio.data('deliveryTime');
        var coordinates = convertStringsToNumbersInArray($radio.data('coordinates'));
        result.push({
          id: id,
          title: title,
          deliveryTime: deliveryTime,
          coordinates: coordinates
        });
      });
      window.pins = result;
      return result; // [{...}, {...}, {...}]
    };
    /* Function for displaying marks on a map */


    var renderPlacemarks = function renderPlacemarks(map, ymaps, pins) {
      var BalloonContentLayout = ymaps.templateLayoutFactory.createClass('<div class="pin" style="width: 220px; padding: 10px;">' + '<p>{{properties.title}} {{properties.deliveryTime}}</p>' + '<button data-id="{{properties.id}}" class="js-pin-button"> Выбрать </button>' + '</div>', {
        // Переопределяем функцию build, чтобы при создании макета начинать
        // слушать событие click на кнопке-счетчике.
        build: function build() {
          // Сначала вызываем метод build родительского класса.
          BalloonContentLayout.superclass.build.call(this); // А затем выполняем дополнительные действия.

          $('.js-pin-button').bind('click', this.onCounterClick);
        },
        // Аналогично переопределяем функцию clear, чтобы снять
        // прослушивание клика при удалении макета с карты.
        clear: function clear() {
          // Выполняем действия в обратном порядке - сначала снимаем слушателя,
          // а потом вызываем метод clear родительского класса.
          $('.js-pin-button').unbind('click', this.onCounterClick);
          BalloonContentLayout.superclass.clear.call(this);
        },
        onCounterClick: function onCounterClick(event) {
          event.preventDefault();
          var id = $('.js-pin-button').data('id');
          $("#".concat(id)).prop('checked', true);
          console.log($("#".concat(id)).val());
          map.balloon.close();
        }
      });
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = pins[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var pin = _step.value;
          var id = pin.id,
              title = pin.title,
              deliveryTime = pin.deliveryTime,
              coordinates = pin.coordinates;
          var placemark = new ymaps.Placemark(coordinates, {
            id: id,
            title: title,
            deliveryTime: deliveryTime
          }, {
            balloonContentLayout: BalloonContentLayout,
            // Запретим замену обычного балуна на балун-панель.
            // Если не указывать эту опцию, на картах маленького размера откроется балун-панель.
            balloonPanelMaxMapArea: 0,
            iconLayout: 'default#image',
            iconImageHref: '../images/pin.png',
            iconImageSize: [30, 37]
          });
          map.geoObjects.add(placemark);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator["return"] != null) {
            _iterator["return"]();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
    };
    /* If checked = true with radio, move the map to the address label specified in radio */


    var addressesOnChagneHandler = function addressesOnChagneHandler(map, pins) {
      var _loop = function _loop(i, length) {
        var _pins$i = pins[i],
            id = _pins$i.id,
            coordinates = _pins$i.coordinates;
        var $radio = $("#".concat(id));
        $radio.on('change', function () {
          map.panTo( // Координаты нового центра карты
          coordinates, {
            /* Опции перемещения:
               разрешить уменьшать и затем увеличивать зум
               карты при перемещении между точками 
            */
            flying: true
          });
        });
      };

      /* [{...}, {...}, {...}] */
      for (var i = 0, length = pins.length; i < length; i++) {
        _loop(i, length);
      }
    };
    /* Group 2 functions for re-use */


    var addNewPlacemarksAndHandlers = function addNewPlacemarksAndHandlers() {
      // remove all previous pins
      window.map.geoObjects.removeAll(); // const {pins, ymaps, map} = window;

      collectPins();
      renderPlacemarks(window.map, window.ymaps, window.pins);
      addressesOnChagneHandler(window.map, window.pins);
    };

    var renderMap = function renderMap() {
      ymaps.ready(init);

      function init() {
        $('#map').removeClass('is-loading');
        var map = new ymaps.Map("map", {
          center: [45.040216, 38.975996],
          zoom: 12
        });
        window.ymaps = ymaps;
        window.map = map; // map.behaviors.disable(['scrollZoom', 'multiTouch', 'drag']);

        map.behaviors.disable(['scrollZoom']);
        addNewPlacemarksAndHandlers();
      }
    };
    /* Function whick combine another function to render select and him parts */


    var defaultRender = function defaultRender(companies) {
      renderCurrentItem(companies.sdek); //default view

      renderList(companies, $('.js-render-list-items'), renderSelectItem);
      initSelects(companies);
      renderMap();
    };
    /* Default request after page loading */


    var defaultAjaxRequest = function defaultAjaxRequest(type) {
      var defaultType = 'byhimself';
      $.ajax({
        url: "http://127.0.0.1:3001",
        success: function success(companies) {
          window.companies = companies;
          defaultRender(window.companies[defaultType]);
        },
        error: function error(_error) {
          console.log(_error);
        }
      });
    };

    defaultAjaxRequest();
  }
})();

;

(function () {
  var $map = $('.js-contact-map');

  if ($map.length) {
    var initMap = function initMap() {
      ymaps.ready(init);

      function init() {
        $('#map').removeClass('is-loading');
        var map = new ymaps.Map("map", {
          center: [53.3331, 83.7869],
          zoom: 16
        });
        var placemark = new ymaps.Placemark([53.3331, 83.7869], {
          openBalloonOnClick: false,
          cursor: 'default'
        }, {
          iconLayout: 'default#image',
          iconImageHref: '../images/pin.png',
          iconImageSize: [30, 37]
        });
        map.behaviors.disable(['scrollZoom']);
        map.geoObjects.add(placemark);
      }
    };

    initMap();
  }
})();

;

(function () {
  var containers = document.querySelectorAll('.js-custom-horizontal-scroll');
  containers.forEach(function (element) {
    var options = {
      wheelPropagation: false
    };
    var container = new PerfectScrollbar(element, options);
  });
})();

;

(function () {
  var containers = document.querySelectorAll('.js-custom-vertical-scroll');
  containers.forEach(function (element) {
    var options = {
      wheelPropagation: false
    };
    var container = new PerfectScrollbar(element, options);
  });
})();

;

(function () {
  'use strict';

  var $filter = $('[js-filter]');

  if ($filter.length) {
    var $toggle = $filter.find('[js-filter-toggle]');
    var $list = $filter.find('[js-filter-list]');
    /* Show/Hide list with filers */

    var toggleHandler = function toggleHandler(event) {
      event.preventDefault();
      $toggle.toggleClass('is-active');
      $list.slideToggle();
    };

    $toggle.off('click.filter').on('click.filter', toggleHandler);
    var $button = $filter.find('[js-filter-button]');
    var $inputs = $filter.find('input');

    var calculatePositionTop = function calculatePositionTop($input) {
      var inputPageY = $input.offset().top;
      var listPageY = $list.offset().top;
      var buttonHeight = $button.outerHeight();
      return inputPageY - listPageY - buttonHeight / 2;
    };

    var showButton = function showButton() {
      var checkedElems = $filter.find('input:checked').length;

      if (!checkedElems) {
        $button.removeClass('is-active');
        return;
      }

      $button.addClass('is-active');
      return checkedElems;
    };

    $inputs.each(function () {
      var _this = this;

      var $input = $(this);

      var inputClickHandler = function inputClickHandler(event) {
        var $target = $(_this);
        $button.css({
          top: calculatePositionTop($target)
        });
        console.log(showButton());
      };

      $input.off('click.button').on('click.button', inputClickHandler);
    });
  }
})();

;

(function () {
  'use strict';

  var $lists = $('[js-filter-list]');

  if ($lists.length) {
    $lists.each(function () {
      var $toggle = $('[js-filter-toggle]');
      var $list = $(this);

      var clickHandler = function clickHandler(evnet) {
        event.preventDefault();
        $toggle.toggleClass('is-active');
        $list.slideToggle();
      };

      $toggle.off('click.filter').on('click.filter', clickHandler);
    });
  }
})();
/* ;(function() {
  'use strict';
  const $forms = $('[js-form]');

  if ($forms.length) {

    const masks = {
      tel: '+7 (999) - 999 - 9999',
      text: '[a-zA-ZА-Яа-я ]*'
    }

    $forms.each(function () {
      const $form = $(this);
      const popupId = $form.data('src');
      const $inputs = $form.find('input');
      
      $inputs.each(function () {
        const $input = $(this);
        const type = $input.attr('type');

        switch (type) {
          case 'tel':
            $input.inputmask({
              mask: masks.tel,
              autoUnmask: true
            });
            break;
          case 'text': 
            $input.inputmask({regex: masks.text});
            break;
          default:
            $input.inputmask();
        }
      });

      $form.on('submit', (event) => {
        event.preventDefault();
        
        const validation = [];
        $inputs.each(function() {
          const $input = $(this);
          
          if ($input.inputmask('isComplete')) {
            validation.push($input.inputmask('isComplete'));
          }
        });

        if (validation.length === $inputs.length) {
          $.fancybox.open({
            src: $form.data('src'),
            type: 'inline',
            opts: {
              closeExisting: true,
              touch: true,
              btnTpl : {
                smallBtn : ''
              }
            }
          });
        }
      });
    });
  }
})();
 */


;

(function () {
  var $body = $('body');
  var $header = $('.body__header');
  var $visibleRow = $header.find('.header-mid');
  var headerHeight = $header.outerHeight();

  var scrollHanlder = function scrollHanlder() {
    if ($(window).scrollTop() > headerHeight) {
      $body.css({
        'padding-top': headerHeight
      });
      $header.addClass('is-scrolling');
      $visibleRow.addClass('is-only');
    }

    if ($(window).scrollTop() < headerHeight) {
      $body.css({
        'padding-top': 0
      });
      $header.removeClass('is-scrolling');
      $visibleRow.removeClass('is-only');
    }
  };

  $(window).scroll(scrollHanlder);
})();

;

(function () {
  'use strict';

  var $container = $('[js-merits]');

  if ($container.length) {
    var $buttons = $('[js-merit-button]');
    var $previousButton = null;
    $buttons.each(function () {
      var _this2 = this;

      var $button = $(this);
      var $display = $container.find('[js-merit-display]');
      var $title = $display.find('[js-merit-title]');
      var $paragraph = $display.find('p');

      var checkPreviousButton = function checkPreviousButton($target) {
        /* if it null */
        if (!$previousButton) {
          $target.addClass('is-active');
          $previousButton = $target;
          return;
        } // if them same


        if ($previousButton === $target) return; // if them various

        if ($previousButton !== $target) {
          $previousButton.removeClass('is-active');
          $target.addClass('is-active');
          $previousButton = $target;
        }
      };

      var clickHandler = function clickHandler(event) {
        event.preventDefault();
        var $target = $(_this2);
        checkPreviousButton($target);

        var _$target$data = $target.data(),
            title = _$target$data.title,
            paragraph = _$target$data.paragraph;

        $title.html("".concat(title));
        $paragraph.text(paragraph);
      };

      $button.off('click.merit').on('click.merit', clickHandler);
    });
    $(window).resize(function (event) {
      var $viewport = $(event.target);

      if ($viewport.innerWidth() < 993) {
        $buttons.removeClass('is-active');
      }
    });
  }
})();

;

(function () {
  objectFitImages();
})();

;

(function () {
  'use strict';

  var $scenes = $('[js-parallax]');

  if ($scenes.length) {
    $scenes.each(function () {
      var $scene = $(this);
      $scene.parallaxify({
        positionProperty: 'transform'
      });
    });
  }
})();

;

(function () {
  'use strict';

  var $buttons = $('[js-popup-open]');

  if ($buttons.length) {
    var $body = $('body');
    var $scrollBarWidth = window.innerWidth - $(window).width();
    $buttons.each(function () {
      var $button = $(this);
      var options = {
        hideScrollbar: true,
        touch: false,
        btnTpl: {
          smallBtn: ''
        },
        beforeShow: function beforeShow() {
          //  Add another bg color
          $('.fancybox-bg').addClass($button.data('src').slice(1));
          var $header = $body.find('.body__header');
          var bodyStyles = {
            'overflow-y': 'hidden',
            'padding-right': "".concat($scrollBarWidth, "px"),
            'margin': '0 auto'
          };
          $body.css(bodyStyles);

          if ($header.hasClass('is-scrolling')) {
            $header.css({
              'padding-right': "".concat($scrollBarWidth, "px")
            });
          }
        },
        afterClose: function afterClose() {
          //  Add another bg color
          $('.fancybox-bg').removeClass($button.data('src').slice(1));
          var $header = $body.find('.body__header');
          var bodyStyles = {
            'overflow-y': 'visible',
            'padding-right': 0,
            'margin': 0
          };
          $body.css(bodyStyles);

          if ($header.hasClass('is-scrolling')) {
            $header.css({
              'padding-right': ''
            });
          }
        }
      };
      $button.fancybox(options);
    });
  }
})();

;

(function () {
  'use strict';

  var $fields = $('[js-layout]');

  if ($fields.length) {
    $fields.each(function () {
      var $fieldContainer = $('[js-layout-container]');
      var $field = $(this);
      var $label = $field.parent(); // type is storing in the label

      var view = $label.data('view');
      /* Elements will represent them self using a css class. */

      var $items = $('[js-catalog-item]');
      var $products = $('[js-product]');
      var $list = $('[js-product-list]');

      var onChangeHandler = function onChangeHandler() {
        if (view === 'row') {
          $items.addClass('is-full');
          $products.addClass('is-row');
          $list.addClass('row-view');
          return;
        }

        if (view === 'default') {
          if ($items.hasClass('is-full') && $products.hasClass('is-row')) {
            $items.removeClass('is-full');
            $products.removeClass('is-row');
            $list.removeClass('row-view');
            return;
          }

          return; // If the layout was default
        }
      };

      $field.off('change.layout').on('change.layout', onChangeHandler);

      var resizeHandler = function resizeHandler(event) {
        var $maxViewWidth = 1115;
        var $target = $(event.target);
        var currentViewWidth = $target.innerWidth();

        if (currentViewWidth < 1115) {
          $products.removeClass('is-row');
          $items.removeClass('is-full');
          $list.removeClass('row-view');
          $fieldContainer.addClass('is-hidden');
          $('[data-view="default"]').find('input').prop('checked', true);
          return;
        }

        if (currentViewWidth >= 1115) {
          $fieldContainer.removeClass('is-hidden');
        }
      };

      $(window).resize(resizeHandler);
    });
  }
})();

;

(function () {
  'use strict';

  var $reviews = $('[js-review]');

  if ($reviews.length) {
    $reviews.each(function () {
      var $review = $(this);
      var $container = $review.find('.review__wrapper');

      var checkOverflow = function checkOverflow(element) {
        var check = element[0].scrollHeight > element.innerHeight() ? true : false;
        check ? $review.addClass('is-overflow') : null;
      };

      checkOverflow($container);
    });
  }
})();

;

(function () {
  'use strict';

  var $scrolls = $('[js-scroll-up]');

  if ($scrolls.length != 0) {
    $scrolls.each(function () {
      var $scroll = $(this);
      $(window).scroll(hideAnchor);

      function hideAnchor(event) {
        var $window = $(this);
        var oneThirdDocumentHeight = $window.height() / 2;

        if ($window.scrollTop() >= oneThirdDocumentHeight) {
          $scroll.addClass('is-active');
        } else {
          $scroll.removeClass('is-active');
        }
      }

      $scroll.off('click.scrollUp').on('click.scrollUp', scroll);

      function scroll(event) {
        event.preventDefault();
        var $target = $(event.$target);
        $('body,html').animate({
          scrollTop: 0
        }, 800);
      }
    });
  }
})();

;

(function () {
  'use strict';

  var $selects = $('[js-select]');

  if ($selects.length) {
    $selects.each(function () {
      var $select = $(this);
      var options = {
        // remove search-box
        minimumResultsForSearch: -1,
        width: 'resolve'
      };
      $select.select2(options);
    });
  }
})();

;

(function () {
  'use strict';

  var $sets = $('[js-set]');

  if ($sets.length) {
    /* An event handler for the function of closing / opening separate groups of fields in the set. */
    // const viewWidth = $('body').width();
    $sets.each(function () {
      var $set = $(this);
      var $toggle = $set.find('[js-set-toggle]'); // $toggle.addClass((viewWidth > 992)? 'is-active': null);

      var $list = $set.find('[js-set-list]');

      var clickHandler = function clickHandler(evnet) {
        $toggle.toggleClass('is-active');
        $list.slideToggle();
      };

      $toggle.off('click.set').on('click.set', clickHandler);
    });
  }
})();

;

(function () {
  'use strict';

  var $nav = $('[js-site-navigation]');

  if ($nav.length) {
    var $toggle = $nav.find('[js-site-navigation-toggle]');
    var $container = $nav.find('[js-site-navigation-container]');

    var clickHandler = function clickHandler() {
      $toggle.toggleClass('is-active');
      $container.slideToggle();
    };

    $toggle.off('click.slideNav').on('click.slideNav', clickHandler);
  }
})();

;

(function () {
  'use strict';

  var $sliders = $('[js-simple-slider]');

  if ($sliders.length) {
    $sliders.each(function () {
      var $slider = $(this);
      var options = {
        slidesToShow: 1,
        useTransform: true,
        speed: 400,
        cssEase: 'cubic-bezier(0.77, 0, 0.18, 1)',
        arrows: false,
        dots: true,
        dotsClass: 'slider__dots',
        customPaging: function customPaging(slider, i) {
          return '<span class="slider__dot"></span>';
        }
      };
      $slider.slick(options);
    });
  }
})();

;

(function () {
  'use strict';

  var $goods = $('[js-good]');

  if ($goods.length) {
    $goods.each(function () {
      var $good = $(this);
      var $sliderSingle = $good.find('[js-sync-slider-single]');
      $sliderSingle.slick({
        slidesToShow: 1,
        slidesToScroll: 1,
        fade: false,
        infinite: false,
        useTransform: true,
        speed: 400,
        cssEase: 'cubic-bezier(0.77, 0, 0.18, 1)'
      });
      var $sliderNav = $good.find('[js-sync-slider-nav]');
      $sliderNav.on('init', function (event, slick) {
        $('.sync-slider_nav .slick-slide.slick-current').addClass('is-active');
      }).slick({
        prevArrow: null,
        nextArrow: null,
        slidesToShow: 4,
        slidesToScroll: 1,
        dots: false,
        focusOnSelect: false,
        infinite: false,
        variableWidth: true,
        swipe: true,
        responsive: [{
          breakpoint: 576,
          settings: {
            slidesToShow: 3
          }
        }]
      });
      $sliderSingle.on('afterChange', function (event, slick, currentSlide) {
        $sliderNav.slick('slickGoTo', currentSlide);
        var currrentNavSlideElem = '.sync-slider_nav .slick-slide[data-slick-index="' + currentSlide + '"]';
        $('.sync-slider_nav .slick-slide.is-active').removeClass('is-active');
        $(currrentNavSlideElem).addClass('is-active');
      });
      $sliderNav.on('click', '.slick-slide', function (event) {
        event.preventDefault();
        var goToSingleSlide = $(this).data('slick-index');
        $sliderSingle.slick('slickGoTo', goToSingleSlide);
      });
    });
  }
})();

;

(function () {
  'use strict';

  var $sliders = $('[js-swiper-slider]');

  if ($sliders.length) {
    $sliders.each(function (idx) {
      var $slider = $(this);
      $slider.addClass("swiper-".concat(idx));
      var options = {
        slidesPerView: 4,
        spaceBetween: 30,
        autoResize: false,
        navigation: {
          nextEl: '.products__button_next',
          prevEl: '.products__button_prev'
        },
        scrollbar: {
          el: '.products__scrollbar',
          draggable: true
        },
        breakpoints: {
          1100: {
            slidesPerView: 3
          },
          845: {
            slidesPerView: 2
          },
          721: {
            spaceBetween: 15
          },
          550: {
            slidesPerView: 1
          }
        }
      };
      var slider = new Swiper(".swiper-".concat(idx), options);
    });
  }
})();

;

(function () {
  'use strict';

  var $tabs = $('[js-tabs]');

  if ($tabs.length) {
    $tabs.each(function () {
      var $tab = $(this);
      $tab.responsiveTabs({
        startCollapsed: 'accordion'
      });
    });
  }
})();

;

(function () {
  var $buttons = $('.js-tip');

  if ($buttons.length) {
    $buttons.each(function () {
      var $button = $(this);
      var options = {
        zIndex: 3,
        contentAsHTML: true,
        content: 'Просто представьтесь и оставьте номер своего телефона. Менеджер перезвонит вам и уточнит всю недостающую информацию.'
      }; // Просто представьтесь и оставьте номер своего телефона. Менеджер перезвонит вам и уточнит всю недостающую информацию.

      $button.tooltipster(options);
    });
  }
})();

;

(function () {
  'use strict';

  var $forms = $('[js-form]');

  if ($forms.length) {
    var initInputMask = function initInputMask($input, attrName) {
      var options = {
        removeMaskOnSubmit: true,
        clearIncomplete: true
      };

      switch (attrName) {
        case 'tel':
          $input.inputmask(_objectSpread({
            mask: masks[attrName]
          }, options, {
            oncomplete: function oncomplete() {
              $(this).blur();
            }
          }));
          break;

        case 'name':
          $input.inputmask(_objectSpread({
            regex: masks.text
          }, options));
          break;
      }
    };

    var masks = {
      tel: '+7 (999) - 999 - 99 99',
      text: '[a-zA-ZА-Яа-я ]*'
    };
    $forms.each(function () {
      var $form = $(this);
      var $inputs = $form.find('input, textarea');
      var $submit = $form.find('button[type="submit"]');
      $inputs.each(function () {
        var $input = $(this);
        var attrName = $input.attr('name');
        initInputMask($input, attrName);

        switch (attrName) {
          case 'message':
            $input.off('invalid').on('invalid', function (event) {
              var validity = event.target.validity;

              if (validity.tooShort) {
                event.target.setCustomValidity('Текст сообщения должен состоять минимум из 5 символов');
              } else if (validity.valueMissing) {
                event.target.setCustomValidity('Напишите, где ошибка или ваши пожелания');
              } else {
                event.target.setCustomValidity('');
              }
            });
            break;

          case 'name':
            $input.off('invalid').on('invalid', function (event) {
              var validity = event.target.validity;

              if (validity.tooShort) {
                event.target.setCustomValidity('Имя должно состоять минимум из 2 символов');
              } else if (validity.valueMissing) {
                event.target.setCustomValidity('Введите ваше имя');
              } else if (validity.patternMismatch) {
                event.target.setCustomValidity('В поле не должно быть чисел и знаков');
              } else {
                event.target.setCustomValidity('');
              }
            });
            break;

          case 'email':
            $input.off('invalid').on('invalid', function (event) {
              var validity = event.target.validity;

              if (validity.valueMissing) {
                event.target.setCustomValidity('Введите вашу электронную почту');
              } else if (validity.typeMismatch) {
                event.target.setCustomValidity('Адрес электронной почты должен соответствовать формату: «abc@abc.com»');
              } else if (validity.patternMismatch) {
                event.target.setCustomValidity('Адрес электронной почты должен соответствовать формату: «abc@abc.com»');
              } else {
                event.target.setCustomValidity('');
              }
            });
            break;

          case 'tel':
            $input.off('invalid').on('invalid', function (event) {
              var target = event.target;
              var validity = target.validity;

              if (validity.valueMissing) {
                event.target.setCustomValidity('Номер телефона должен состоять из 11 цифр');
              } else {
                event.target.setCustomValidity('');
              }
            });
            break;
        }
      });
    });
  }
})();

;

(function () {
  'use strict';

  var $items = $('[js-zoom]');

  if ($items.length && $('body').width() >= 1000) {
    $items.each(function () {
      var $item = $(this);
      var options = {
        url: false,
        magnify: 1.5,
        touch: false
      };
      $item.zoom(options);
    });
    console.log($('body').width());
  }
})();
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNhcnQtc2xpZGUuanMiLCJjYXRlZ29yaWVzLXNsaWRlLmpzIiwiY2hlY2tvdXQuanMiLCJjb250YWN0cy1tYXAuanMiLCJjdXN0b20taG9yaXpvbnRhbC1zY3JvbGwuanMiLCJjdXN0b20tdmVydGljYWwtc2Nyb2xsLmpzIiwiZmlsdGVyLWJ1dHRvbi5qcyIsImZpbHRlci1zbGlkZS5qcyIsImZvcm0uanMiLCJoZWFkZXItc2Nyb2xsLmpzIiwibWVyaXQuanMiLCJvYmplY3QtZml0LmpzIiwicGFyYWxsYXguanMiLCJwb3B1cC1vcGVuLmpzIiwicHJvZHVjdC1jaGFuZ2UtbGF5b3V0LmpzIiwicmV2aWV3cy5qcyIsInNjcm9sbC11cC5qcyIsInNlbGVjdHMuanMiLCJzZXQuanMiLCJzaXRlLW5hdmlnYXRpb24uanMiLCJzbGljay1zaW1wbGUtc2xpZGVyLmpzIiwic2xpY2stc3luYy1zbGlkZXJzLmpzIiwic3dpcGVyLXNsaWRlci5qcyIsInRhYnMuanMiLCJ0b29sdGlwcy5qcyIsInZhbGlkYXRpb24uanMiLCJ6b29tLmpzIl0sIm5hbWVzIjpbIiRjYXJ0cyIsIiQiLCJsZW5ndGgiLCJlYWNoIiwiJGNhcnQiLCJjbGlja0hhbmRsZXIiLCJldmVudCIsInN0b3BQcm9wYWdhdGlvbiIsIiRsaXN0IiwiZmluZCIsInRvZ2dsZUNsYXNzIiwic2xpZGVUb2dnbGUiLCJkb2N1bWVudCIsIm9uIiwiaXMiLCJ0YXJnZXQiLCJoYXMiLCJyZW1vdmVDbGFzcyIsInNsaWRlVXAiLCIkdG9nZ2xlcyIsIiR0b2dnbGUiLCIkcGFyZW50IiwicGFyZW50Iiwib2ZmIiwiJGNoZWNrb3V0IiwiJHN0YXJ0QnRuIiwiJGZpcnN0Q2hlY2tvdXRJbnB1dCIsImRvY3VtZW50RWxlbWVudCIsImJvZHkiLCJhbmltYXRlIiwic2Nyb2xsVG9wIiwib2Zmc2V0IiwidG9wIiwiaGVpZ2h0IiwiZm9jdXMiLCIkdHlwZXMiLCIkdHlwZSIsIiRtYXAiLCIkZm9ybSIsInR5cGUiLCJ2YWwiLCJhZGRDbGFzcyIsInJlbmRlckN1cnJlbnRJdGVtIiwid2luZG93IiwiY29tcGFuaWVzIiwic2RlayIsInJlbmRlckxpc3QiLCJyZW5kZXJTZWxlY3RJdGVtIiwiaW5pdFNlbGVjdHMiLCJhZGROZXdQbGFjZW1hcmtzQW5kSGFuZGxlcnMiLCJwb2NodGFyZiIsImNvbXBhbnkiLCIkcGxhY2VGb3JSZW5kZXIiLCJjaGVja2VkIiwibG9nbyIsInRpdGxlIiwidmFsdWUiLCJkZWxpdmVyeVRpbWUiLCJjb3N0IiwicmVtb3ZlIiwidGVtcGxhdGUiLCJodG1sIiwiJGl0ZW0iLCJjbG9uZSIsInByb3AiLCJhdHRyIiwidGV4dCIsImFwcGVuZCIsInNlbGVjdEl0ZW0iLCJzdHJlZXRzIiwiZW1wdHkiLCJ1bmRlZmluZWQiLCJyZW5kZXJJdGVtc0luTWFwIiwiaXRlbXMiLCJyZW5kZXJGdW5jdGlvbiIsImNvdW50IiwiQXJyYXkiLCJpc0FycmF5IiwiaSIsInJlcGxhY2VTZWxlY3RlZEl0ZW0iLCJzZWxlY3RJdGVtSGFuZGxlciIsIiRzZWxlY3QiLCJsaXN0TGVuZ3RoIiwiY2hpbGRyZW4iLCIkaXRlbXMiLCJQZXJmZWN0U2Nyb2xsYmFyIiwid2hlZWxQcm9wYWdhdGlvbiIsIiRyYWRpbyIsInJhZGlvVmFsIiwiJHNlbGVjdHMiLCJjb29yZGluYXRlcyIsImNvbnZlcnRTdHJpbmdzVG9OdW1iZXJzSW5BcnJheSIsInN0ciIsInJlc3VsdCIsInNwbGl0IiwibWFwIiwiaXRlbSIsImNvbGxlY3RQaW5zIiwiJHJhZGlvcyIsImlkIiwiZGF0YSIsInB1c2giLCJwaW5zIiwicmVuZGVyUGxhY2VtYXJrcyIsInltYXBzIiwiQmFsbG9vbkNvbnRlbnRMYXlvdXQiLCJ0ZW1wbGF0ZUxheW91dEZhY3RvcnkiLCJjcmVhdGVDbGFzcyIsImJ1aWxkIiwic3VwZXJjbGFzcyIsImNhbGwiLCJiaW5kIiwib25Db3VudGVyQ2xpY2siLCJjbGVhciIsInVuYmluZCIsInByZXZlbnREZWZhdWx0IiwiY29uc29sZSIsImxvZyIsImJhbGxvb24iLCJjbG9zZSIsInBpbiIsInBsYWNlbWFyayIsIlBsYWNlbWFyayIsImJhbGxvb25Db250ZW50TGF5b3V0IiwiYmFsbG9vblBhbmVsTWF4TWFwQXJlYSIsImljb25MYXlvdXQiLCJpY29uSW1hZ2VIcmVmIiwiaWNvbkltYWdlU2l6ZSIsImdlb09iamVjdHMiLCJhZGQiLCJhZGRyZXNzZXNPbkNoYWduZUhhbmRsZXIiLCJwYW5UbyIsImZseWluZyIsInJlbW92ZUFsbCIsInJlbmRlck1hcCIsInJlYWR5IiwiaW5pdCIsIk1hcCIsImNlbnRlciIsInpvb20iLCJiZWhhdmlvcnMiLCJkaXNhYmxlIiwiZGVmYXVsdFJlbmRlciIsImRlZmF1bHRBamF4UmVxdWVzdCIsImRlZmF1bHRUeXBlIiwiYWpheCIsInVybCIsInN1Y2Nlc3MiLCJlcnJvciIsImluaXRNYXAiLCJvcGVuQmFsbG9vbk9uQ2xpY2siLCJjdXJzb3IiLCJjb250YWluZXJzIiwicXVlcnlTZWxlY3RvckFsbCIsImZvckVhY2giLCJlbGVtZW50Iiwib3B0aW9ucyIsImNvbnRhaW5lciIsIiRmaWx0ZXIiLCJ0b2dnbGVIYW5kbGVyIiwiJGJ1dHRvbiIsIiRpbnB1dHMiLCJjYWxjdWxhdGVQb3NpdGlvblRvcCIsIiRpbnB1dCIsImlucHV0UGFnZVkiLCJsaXN0UGFnZVkiLCJidXR0b25IZWlnaHQiLCJvdXRlckhlaWdodCIsInNob3dCdXR0b24iLCJjaGVja2VkRWxlbXMiLCJpbnB1dENsaWNrSGFuZGxlciIsIiR0YXJnZXQiLCJjc3MiLCIkbGlzdHMiLCJldm5ldCIsIiRib2R5IiwiJGhlYWRlciIsIiR2aXNpYmxlUm93IiwiaGVhZGVySGVpZ2h0Iiwic2Nyb2xsSGFubGRlciIsInNjcm9sbCIsIiRjb250YWluZXIiLCIkYnV0dG9ucyIsIiRwcmV2aW91c0J1dHRvbiIsIiRkaXNwbGF5IiwiJHRpdGxlIiwiJHBhcmFncmFwaCIsImNoZWNrUHJldmlvdXNCdXR0b24iLCJwYXJhZ3JhcGgiLCJyZXNpemUiLCIkdmlld3BvcnQiLCJpbm5lcldpZHRoIiwib2JqZWN0Rml0SW1hZ2VzIiwiJHNjZW5lcyIsIiRzY2VuZSIsInBhcmFsbGF4aWZ5IiwicG9zaXRpb25Qcm9wZXJ0eSIsIiRzY3JvbGxCYXJXaWR0aCIsIndpZHRoIiwiaGlkZVNjcm9sbGJhciIsInRvdWNoIiwiYnRuVHBsIiwic21hbGxCdG4iLCJiZWZvcmVTaG93Iiwic2xpY2UiLCJib2R5U3R5bGVzIiwiaGFzQ2xhc3MiLCJhZnRlckNsb3NlIiwiZmFuY3lib3giLCIkZmllbGRzIiwiJGZpZWxkQ29udGFpbmVyIiwiJGZpZWxkIiwiJGxhYmVsIiwidmlldyIsIiRwcm9kdWN0cyIsIm9uQ2hhbmdlSGFuZGxlciIsInJlc2l6ZUhhbmRsZXIiLCIkbWF4Vmlld1dpZHRoIiwiY3VycmVudFZpZXdXaWR0aCIsIiRyZXZpZXdzIiwiJHJldmlldyIsImNoZWNrT3ZlcmZsb3ciLCJjaGVjayIsInNjcm9sbEhlaWdodCIsImlubmVySGVpZ2h0IiwiJHNjcm9sbHMiLCIkc2Nyb2xsIiwiaGlkZUFuY2hvciIsIiR3aW5kb3ciLCJvbmVUaGlyZERvY3VtZW50SGVpZ2h0IiwibWluaW11bVJlc3VsdHNGb3JTZWFyY2giLCJzZWxlY3QyIiwiJHNldHMiLCIkc2V0IiwiJG5hdiIsIiRzbGlkZXJzIiwiJHNsaWRlciIsInNsaWRlc1RvU2hvdyIsInVzZVRyYW5zZm9ybSIsInNwZWVkIiwiY3NzRWFzZSIsImFycm93cyIsImRvdHMiLCJkb3RzQ2xhc3MiLCJjdXN0b21QYWdpbmciLCJzbGlkZXIiLCJzbGljayIsIiRnb29kcyIsIiRnb29kIiwiJHNsaWRlclNpbmdsZSIsInNsaWRlc1RvU2Nyb2xsIiwiZmFkZSIsImluZmluaXRlIiwiJHNsaWRlck5hdiIsInByZXZBcnJvdyIsIm5leHRBcnJvdyIsImZvY3VzT25TZWxlY3QiLCJ2YXJpYWJsZVdpZHRoIiwic3dpcGUiLCJyZXNwb25zaXZlIiwiYnJlYWtwb2ludCIsInNldHRpbmdzIiwiY3VycmVudFNsaWRlIiwiY3VycnJlbnROYXZTbGlkZUVsZW0iLCJnb1RvU2luZ2xlU2xpZGUiLCJpZHgiLCJzbGlkZXNQZXJWaWV3Iiwic3BhY2VCZXR3ZWVuIiwiYXV0b1Jlc2l6ZSIsIm5hdmlnYXRpb24iLCJuZXh0RWwiLCJwcmV2RWwiLCJzY3JvbGxiYXIiLCJlbCIsImRyYWdnYWJsZSIsImJyZWFrcG9pbnRzIiwiU3dpcGVyIiwiJHRhYnMiLCIkdGFiIiwicmVzcG9uc2l2ZVRhYnMiLCJzdGFydENvbGxhcHNlZCIsInpJbmRleCIsImNvbnRlbnRBc0hUTUwiLCJjb250ZW50IiwidG9vbHRpcHN0ZXIiLCIkZm9ybXMiLCJpbml0SW5wdXRNYXNrIiwiYXR0ck5hbWUiLCJyZW1vdmVNYXNrT25TdWJtaXQiLCJjbGVhckluY29tcGxldGUiLCJpbnB1dG1hc2siLCJtYXNrIiwibWFza3MiLCJvbmNvbXBsZXRlIiwiYmx1ciIsInJlZ2V4IiwidGVsIiwiJHN1Ym1pdCIsInZhbGlkaXR5IiwidG9vU2hvcnQiLCJzZXRDdXN0b21WYWxpZGl0eSIsInZhbHVlTWlzc2luZyIsInBhdHRlcm5NaXNtYXRjaCIsInR5cGVNaXNtYXRjaCIsIm1hZ25pZnkiXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBOztBQUFBLGFBQUE7QUFDQTs7QUFDQSxNQUFBQSxNQUFBLEdBQUFDLENBQUEsQ0FBQSxXQUFBLENBQUE7O0FBRUEsTUFBQUQsTUFBQSxDQUFBRSxNQUFBLEVBQUE7QUFDQUYsSUFBQUEsTUFBQSxDQUFBRyxJQUFBLENBQUEsWUFBQTtBQUNBLFVBQUFDLEtBQUEsR0FBQUgsQ0FBQSxDQUFBLElBQUEsQ0FBQTs7QUFFQSxVQUFBSSxZQUFBLEdBQUEsU0FBQUEsWUFBQSxDQUFBQyxLQUFBLEVBQUE7QUFDQUEsUUFBQUEsS0FBQSxDQUFBQyxlQUFBLEdBREEsQ0FDQTs7QUFDQSxZQUFBQyxLQUFBLEdBQUFKLEtBQUEsQ0FBQUssSUFBQSxDQUFBLGdCQUFBLENBQUE7QUFDQUwsUUFBQUEsS0FBQSxDQUFBTSxXQUFBLENBQUEsU0FBQTtBQUNBRixRQUFBQSxLQUFBLENBQUFHLFdBQUE7QUFF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QUFBLE1BQUEsQ0FBQSxDQUFBcU0sS0FBQSxNQUFBLElBQUEsRUFBQTtBQUNBbEgsSUFBQUEsTUFBQSxDQUFBakYsSUFBQSxDQUFBLFlBQUE7QUFDQSxVQUFBMkQsS0FBQSxHQUFBN0QsQ0FBQSxDQUFBLElBQUEsQ0FBQTtBQUNBLFVBQUEySixPQUFBLEdBQUE7QUFDQVYsUUFBQUEsR0FBQSxFQUFBLEtBREE7QUFFQThKLFFBQUFBLE9BQUEsRUFBQSxHQUZBO0FBR0F4RyxRQUFBQSxLQUFBLEVBQUE7QUFIQSxPQUFBO0FBTUExSSxNQUFBQSxLQUFBLENBQUE2RSxJQUFBLENBQUFpQixPQUFBO0FBQ0EsS0FUQTtBQVVBeEMsSUFBQUEsT0FBQSxDQUFBQyxHQUFBLENBQUFwSCxDQUFBLENBQUEsTUFBQSxDQUFBLENBQUFxTSxLQUFBLEVBQUE7QUFDQTtBQUVBLENBbkJBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyI7KGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIGNvbnN0ICRjYXJ0cyA9ICQoJ1tqcy1jYXJ0XScpO1xuXG4gIGlmICgkY2FydHMubGVuZ3RoKSB7XG4gICAgJGNhcnRzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICBjb25zdCAkY2FydCA9ICQodGhpcyk7XG5cbiAgICAgIGNvbnN0IGNsaWNrSGFuZGxlciA9IChldmVudCkgPT4ge1xuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTsgLy8gUmVtb3ZlIGV2ZW50IGhvaXN0aW5nIFxuICAgICAgICBjb25zdCAkbGlzdCA9ICRjYXJ0LmZpbmQoJ1tqcy1jYXJ0LWxpc3RdJyk7XG4gICAgICAgICRjYXJ0LnRvZ2dsZUNsYXNzKCdpcy1vcGVuJyk7XG4gICAgICAgICRsaXN0LnNsaWRlVG9nZ2xlKCk7XG4gICAgICAgIFxuICAgICAgfTtcbiAgICAgIFxuICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrLm9wZW4ucG9wdXAnLCAnW2pzLWNhcnQtb3Blbl0nLCBjbGlja0hhbmRsZXIpO1xuICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrLmNsb3NlLnBvcHVwJywgJ1tqcy1jYXJ0LWNsb3NlXScsIGNsaWNrSGFuZGxlcik7XG4gICAgICBcbiAgICAgIC8qIEFuIGV2ZW50IGhhbmRsZXIgdG8gY29udHJvbCBhIGNsaWNrIG91dHNpZGUgdGhlIGNhcnQgYXJlYS4gKi9cblxuICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrLm91dHNpZGUucG9wdXAnLChldmVudCkgPT4ge1xuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgaWYgKCEkY2FydC5pcyhldmVudC50YXJnZXQpICYmICRjYXJ0LmhhcyhldmVudC50YXJnZXQpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIGNvbnN0ICRsaXN0ID0gJGNhcnQuZmluZCgnW2pzLWNhcnQtbGlzdF0nKTtcbiAgICAgICAgICBcbiAgICAgICAgICAkY2FydC5yZW1vdmVDbGFzcygnaXMtb3BlbicpO1xuICAgICAgICAgICRsaXN0LnNsaWRlVXAoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn0oKSk7IiwiOyhmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICBjb25zdCAkdG9nZ2xlcyA9ICQoJy5qcy1jYXRlZ29yaWVzLXRvZ2dsZScpO1xuXG5cbiAgaWYgKCR0b2dnbGVzLmxlbmd0aCkge1xuICAgIGNvbnN0ICRsaXN0ID0gJCgnLmpzLWNhdGVnb3JpZXMtbmVzdGVkLWxpc3QnKTtcblxuICAgICR0b2dnbGVzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICBjb25zdCAkdG9nZ2xlID0gJCh0aGlzKTtcbiAgICAgIGNvbnN0ICRwYXJlbnQgPSAkdG9nZ2xlLnBhcmVudCgpO1xuXG4gICAgICBmdW5jdGlvbiBjbGlja0hhbmRsZXIoKSB7XG4gICAgICAgICRsaXN0LnNsaWRlVG9nZ2xlKCk7XG4gICAgICAgICRwYXJlbnQudG9nZ2xlQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuICAgICAgfVxuXG4gICAgICAkdG9nZ2xlLm9mZignY2xpY2snKS5vbignY2xpY2snLCBjbGlja0hhbmRsZXIpO1xuICAgIH0pO1xuICB9XG59KSgpOyIsIjsoZnVuY3Rpb24oKSB7XG4gIGNvbnN0ICRjaGVja291dCA9ICQoJy5qcy1jaGVja291dCcpO1xuXG4gIGlmICgkY2hlY2tvdXQubGVuZ3RoKSB7XG4gICAgY29uc3QgJHN0YXJ0QnRuID0gJCgnLmpzLWNoZWNrb3V0LXN0YXJ0LW9yZGVyJyk7XG4gICAgJHN0YXJ0QnRuLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgIGNvbnN0ICRmaXJzdENoZWNrb3V0SW5wdXQgPSAkKCcuanMtY2hlY2tvdXQtc3RhcnQtZm9jdXMnKTtcbiAgICAgICQoW2RvY3VtZW50LmRvY3VtZW50RWxlbWVudCwgZG9jdW1lbnQuYm9keV0pLmFuaW1hdGUoe1xuICAgICAgICBzY3JvbGxUb3A6ICRmaXJzdENoZWNrb3V0SW5wdXQub2Zmc2V0KCkudG9wIC0gKCQoJy5oZWFkZXItbWlkJykuaGVpZ2h0KCkgKiAyLjUpIC8vTWFnaWMgZmFjdG9yIGluIG9yZGVyIHRvIGxvb2sgYmVhdXRpZnVsIHRoZSBlbGVtZW50IHRvIHdoaWNoIHdlIHNjcm9sbCB0aGUgcGFnZVxuICAgICAgfSwgMTAwMCk7XG4gICAgICAkZmlyc3RDaGVja291dElucHV0LmZvY3VzKCk7XG4gICAgfSk7XG5cbiAgICAvKiBUaGUgcGFydCBvZiB0aGUgY29kZSB0aGF0IGlzIHJlc3BvbnNpYmxlIGZvciB0aGUgY2hhbmdlcyBpbiB0aGUgdHlwZXMgb2YgZGVsaXZlcnkgYW5kIGZ1cnRoZXIgY29uc2VxdWVuY2VzICovXG4gICAgY29uc3QgJHR5cGVzID0gJCgnLmpzLWNoZWNrb3V0LXJhZGlvIGlucHV0Jyk7XG4gICAgJHR5cGVzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICBjb25zdCAkdHlwZSA9ICQodGhpcyk7XG4gICAgICBjb25zdCAkbWFwID0gJGNoZWNrb3V0LmZpbmQoJy5qcy1jaGVrb3V0LW1hcCcpO1xuICAgICAgY29uc3QgJGZvcm0gPSAkY2hlY2tvdXQuZmluZCgnLmpzLWNoZWNrb3V0LWZvcm0tcGFydCcpO1xuXG4gICAgICAkdHlwZS5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICBjb25zdCB0eXBlID0gJHR5cGUudmFsKCk7XG5cbiAgICAgICAgaWYgKHR5cGUgPT09ICdieWhpbXNlbGYnKSB7XG4gICAgICAgICAgJG1hcC5yZW1vdmVDbGFzcygnaXMtaGlkZGVuJyk7XG4gICAgICAgICAgJGZvcm0uYWRkQ2xhc3MoJ2lzLWhpZGRlbicpO1xuICAgICAgICAgIHJlbmRlckN1cnJlbnRJdGVtKHdpbmRvdy5jb21wYW5pZXNbdHlwZV0uc2Rlayk7IC8vZGVmYXVsdCB2aWV3XG4gICAgICAgICAgcmVuZGVyTGlzdCh3aW5kb3cuY29tcGFuaWVzW3R5cGVdLCAkKCcuanMtcmVuZGVyLWxpc3QtaXRlbXMnKSwgcmVuZGVyU2VsZWN0SXRlbSk7XG4gICAgICAgICAgaW5pdFNlbGVjdHMod2luZG93LmNvbXBhbmllc1t0eXBlXSk7XG4gICAgICAgICAgYWRkTmV3UGxhY2VtYXJrc0FuZEhhbmRsZXJzKCk7XG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH0gICBcbiAgICAgICAgXG4gICAgICAgIGlmICh0eXBlID09PSAnY291cmllcicpIHtcbiAgICAgICAgICAkbWFwLmFkZENsYXNzKCdpcy1oaWRkZW4nKTtcbiAgICAgICAgICAkZm9ybS5yZW1vdmVDbGFzcygnaXMtaGlkZGVuJyk7XG4gICAgICAgICAgcmVuZGVyQ3VycmVudEl0ZW0od2luZG93LmNvbXBhbmllc1t0eXBlXS5zZGVrKTsgLy9kZWZhdWx0IHZpZXdcbiAgICAgICAgICByZW5kZXJMaXN0KHdpbmRvdy5jb21wYW5pZXNbdHlwZV0sICQoJy5qcy1yZW5kZXItbGlzdC1pdGVtcycpLCByZW5kZXJTZWxlY3RJdGVtKTtcbiAgICAgICAgICBpbml0U2VsZWN0cyh3aW5kb3cuY29tcGFuaWVzW3R5cGVdKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gIFxuICAgICAgICBcbiAgICAgICAgaWYgKHR5cGUgPT09ICdwb3N0b2ZmaWNlJykge1xuICAgICAgICAgICRtYXAuYWRkQ2xhc3MoJ2lzLWhpZGRlbicpO1xuICAgICAgICAgICRmb3JtLnJlbW92ZUNsYXNzKCdpcy1oaWRkZW4nKTtcbiAgICAgICAgICByZW5kZXJDdXJyZW50SXRlbSh3aW5kb3cuY29tcGFuaWVzW3R5cGVdLnBvY2h0YXJmKTsgLy9kZWZhdWx0IHZpZXdcbiAgICAgICAgICByZW5kZXJMaXN0KHdpbmRvdy5jb21wYW5pZXNbdHlwZV0sICQoJy5qcy1yZW5kZXItbGlzdC1pdGVtcycpLCByZW5kZXJTZWxlY3RJdGVtKTtcbiAgICAgICAgICBpbml0U2VsZWN0cyh3aW5kb3cuY29tcGFuaWVzW3R5cGVdKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gXG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIC8qIFJlbmRlcmluZyBwYXJ0cyBvZiBzZWxlY3QgaW4gRE9NIEVsZW1lbnQgKi9cbiAgICBjb25zdCByZW5kZXJTZWxlY3RJdGVtID0gKGNvbXBhbnksICRwbGFjZUZvclJlbmRlciwgY2hlY2tlZD0nJykgPT4ge1xuICAgICAgY29uc3Qge2xvZ28sIHRpdGxlLCB2YWx1ZSwgZGVsaXZlcnlUaW1lLCBjb3N0fSA9IGNvbXBhbnk7XG4gICAgICBjb25zdCAkcGFyZW50ID0gJCgnLmpzLWZha2Utc2VsZWN0LWFqYXgnKTtcbiAgICAgICRwYXJlbnQucmVtb3ZlKCdpcy1lbXB0eScpO1xuICAgICAgXG5cbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gJCgnLmpzLXNlbGVjdC1pdGVtLXRlbXBsYXRlJykuaHRtbCgpO1xuICAgICAgY29uc3QgJGl0ZW0gPSAkKHRlbXBsYXRlKS5jbG9uZSgpO1xuXG4gICAgICAvKiBNb2RpZnkgdGVtcGxhdGUgKi9cbiAgICAgICRpdGVtLmZpbmQoJy5qcy1zZWxlY3QtcmFkaW8nKS5wcm9wKCd2YWx1ZScsIHZhbHVlKTtcbiAgICAgIGlmIChjaGVja2VkKSB7XG4gICAgICAgICRpdGVtLmZpbmQoJy5qcy1zZWxlY3QtcmFkaW8nKS5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG4gICAgICB9XG5cbiAgICAgICRpdGVtLmZpbmQoJy5qcy1zZWxlY3QtaXRlbS1pbWFnZScpLmF0dHIoJ3NyYycsIGAke2xvZ299YCk7XG4gICAgICBpZiAodGl0bGUpICRpdGVtLmZpbmQoJy5qcy1zZWxlY3QtaXRlbS10aXRsZScpLnRleHQodGl0bGUpO1xuICAgICAgJGl0ZW0uZmluZCgnLmpzLXNlbGVjdC1pdGVtLWRlbGl2ZXJ5VGltZScpLnRleHQoZGVsaXZlcnlUaW1lKTtcbiAgICAgICRpdGVtLmZpbmQoJy5qcy1zZWxlY3QtaXRlbS1wcmljZScpLnRleHQoY29zdCk7XG5cbiAgICAgICRwbGFjZUZvclJlbmRlci5hcHBlbmQoJGl0ZW0pO1xuICAgIH07XG5cbiAgICAvKiBTcGVjaWFsIGZ1bmN0aW9uIGZvciByZS1yZW5kZXIgQ2hlY2tlZCBJdGVtICovXG4gICAgY29uc3QgcmVuZGVyQ3VycmVudEl0ZW0gPSAoe3NlbGVjdEl0ZW0sIHN0cmVldHN9KSA9PiB7XG4gICAgICBjb25zdCAkcGxhY2VGb3JSZW5kZXIgPSAkKCcuanMtcmVuZGVyLWN1cnJlbnRJdGVtJyk7XG4gICAgICAkcGxhY2VGb3JSZW5kZXIuZW1wdHkoKTtcblxuICAgICAgcmVuZGVyU2VsZWN0SXRlbShzZWxlY3RJdGVtLCAkcGxhY2VGb3JSZW5kZXIsICdjaGVja2VkJyk7XG4gICAgICBcbiAgICAgIGlmICghc3RyZWV0cyA9PT0gdW5kZWZpbmVkKSByZXR1cm47IC8vIGluIGpzb24gdGhlcmUgaXMgbm8gc3VjaCBmaWVsZFxuICAgICAgcmVuZGVyTGlzdChzdHJlZXRzLCAkKCcuanMtbWFwLWl0ZW1zJyksIHJlbmRlckl0ZW1zSW5NYXApO1xuICAgIH1cblxuICAgIGNvbnN0IHJlbmRlckxpc3QgPSAoaXRlbXMsICRwbGFjZUZvclJlbmRlciwgcmVuZGVyRnVuY3Rpb24pID0+IHtcbiAgICAgIGxldCBjb3VudCA9IDA7XG4gICAgICAvKiBUaGUgcGFyYW1ldGVyIGNhbiBiZSBib3RoIGFuIG9iamVjdCBhbmQgYW4gYXJyYXkuIFRoZSBmdW5jdGlvbiByZW5kZXJzIHNlbGVjdCBlbGVtZW50cyBhbmQgYSBsaXN0IG9mIGFkZHJlc3NlcyBuZWFyIHRoZSBtYXAuICovXG4gICAgICAkcGxhY2VGb3JSZW5kZXIuZW1wdHkoKTtcbiAgICAgICRwbGFjZUZvclJlbmRlci5yZW1vdmVDbGFzcygnaXMtb3BlbicpO1xuXG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGl0ZW1zKSkgeyBcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgICAgcmVuZGVyRnVuY3Rpb24oaXRlbXNbaV0sICRwbGFjZUZvclJlbmRlciwgY291bnQpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBjb21wYW55IGluIGl0ZW1zKSB7XG4gICAgICAgICAgaWYgKGl0ZW1zW2NvbXBhbnldLnNlbGVjdEl0ZW0udmFsdWUgPT09ICdwb2NodGFyZicpIHJldHVybjsgLy8gcG9jaHRhcmYgZG9lcyBub3QgaGF2ZSBhIGRyb3AtZG93biBsaXN0LlxuICAgICAgICAgIHJlbmRlckZ1bmN0aW9uKGl0ZW1zW2NvbXBhbnldLnNlbGVjdEl0ZW0sICRwbGFjZUZvclJlbmRlcik7XG4gICAgICAgIH1cbiAgICAgIH0gXG4gICAgfVxuXG4gICAgLyogV2hlbiB5b3UgY2xpY2sgb24gYW55IGVsZW1lbnQgaW4gZmFrZSBzZWxlY3QsIHJlcGxhY2UgdGhlIHByZXZpb3VzbHkgc2VsZWN0ZWQgZWxlbWVudC4gVmlzdWFsbHkhICovXG4gICAgY29uc3QgcmVwbGFjZVNlbGVjdGVkSXRlbSA9ICgkaXRlbSwgJHBsYWNlRm9yUmVuZGVyKSA9PiB7XG4gICAgICAkcGxhY2VGb3JSZW5kZXIuZW1wdHkoKTtcbiAgICAgICRwbGFjZUZvclJlbmRlci5hcHBlbmQoJGl0ZW0uY2xvbmUodHJ1ZSkpO1xuICAgIH07XG5cbiAgICAvKiBBZGQgbGlzdGVuZXIgZm9yIGl0ZW1zICovXG4gICAgY29uc3Qgc2VsZWN0SXRlbUhhbmRsZXIgPSAoJHNlbGVjdCwgY29tcGFuaWVzKSA9PiB7XG4gICAgICBjb25zdCAkbGlzdCA9ICRzZWxlY3QuZmluZCgnLmRldGFpbGVkLXNlbGVjdF9fbGlzdCcpO1xuICAgICAgY29uc3QgbGlzdExlbmd0aCA9ICRsaXN0LmNoaWxkcmVuKCkubGVuZ3RoO1xuICAgICAgY29uc3QgJGl0ZW1zID0gJHNlbGVjdC5maW5kKCcuZGV0YWlsZWQtc2VsZWN0X19pdGVtJyk7XG5cbiAgICAgIGlmIChsaXN0TGVuZ3RoKSB7XG4gICAgICAgICRzZWxlY3QuYWRkQ2xhc3MoJ2Ryb3Bkb3duJyk7XG4gICAgICAgIG5ldyBQZXJmZWN0U2Nyb2xsYmFyKCcuZGV0YWlsZWQtc2VsZWN0X19saXN0Jywge3doZWVsUHJvcGFnYXRpb246IGZhbHNlfSk7IC8vIHVwZGF0ZSBjdXN0b20gc2Nyb2xsXG4gICAgICB9IGVsc2Uge1xuICAgICAgICAkc2VsZWN0LnJlbW92ZUNsYXNzKCdkcm9wZG93bicpO1xuICAgICAgfVxuICAgICAgXG4gICAgICAkaXRlbXMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc3QgJGl0ZW0gPSAkKHRoaXMpO1xuICAgICAgICBjb25zdCAkcGxhY2VGb3JSZW5kZXIgPSAkc2VsZWN0LmZpbmQoJy5kZXRhaWxlZC1zZWxlY3RfX2N1cnJlbnQnKTtcbiAgICAgICAgY29uc3QgJHJhZGlvID0gJGl0ZW0uZmluZCgnLmpzLXNlbGVjdC1yYWRpbycpO1xuICAgICAgICBjb25zdCByYWRpb1ZhbCA9ICRyYWRpby52YWwoKTsgXG4gICAgICBcbiAgICAgICAgJGl0ZW0ub2ZmKCdjbGljay5zZWxlY3QnKS5vbignY2xpY2suc2VsZWN0JywgKCkgPT4ge1xuICAgICAgICAgICRyYWRpby5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG4gICAgICAgICAgXG4gICAgICAgICAgaWYgKCFsaXN0TGVuZ3RoKSByZXR1cm47IC8vIFRoZXJlIGlzIG5vIG5lZWQgdG8gb3BlbiBhIGJsYW5rIHNoZWV0IGFuZCBkbyBub3QgbmVlZCB0byByZWFkIGRhdGEgZm9yIHJlbmRlcmluZyBhZGRyZXNzZXNcblxuICAgICAgICAgICRzZWxlY3QudG9nZ2xlQ2xhc3MoJ2lzLW9wZW4nKTtcbiAgICAgICAgICAkbGlzdC50b2dnbGVDbGFzcygnaXMtb3BlbicpO1xuICAgICAgICAgIGlmICghKCRwbGFjZUZvclJlbmRlci5maW5kKCdpbnB1dCcpLnZhbCgpID09PSByYWRpb1ZhbCkpIHtcbiAgICAgICAgICAgIHJlcGxhY2VTZWxlY3RlZEl0ZW0oJGl0ZW0sICRwbGFjZUZvclJlbmRlcik7XG4gICAgICAgICAgICBpZiAoY29tcGFuaWVzW3JhZGlvVmFsXSkge1xuICAgICAgICAgICAgICByZW5kZXJMaXN0KGNvbXBhbmllc1tyYWRpb1ZhbF0uc3RyZWV0cywgJCgnLmpzLW1hcC1pdGVtcycpLCByZW5kZXJJdGVtc0luTWFwKTtcbiAgICAgICAgICAgICAgYWRkTmV3UGxhY2VtYXJrc0FuZEhhbmRsZXJzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qIEFkZCBsaXN0ZW5lciBmb3IgaXRlbXMgKi9cbiAgICBjb25zdCBpbml0U2VsZWN0cyA9IChjb21wYW5pZXMpID0+IHsgLy97ey4uLn0sIHsuLi59LCB7Li4ufX1cbiAgICAgIGNvbnN0ICRzZWxlY3RzID0gJCgnLmpzLWZha2Utc2VsZWN0Jyk7XG4gICAgICAkc2VsZWN0cy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zdCAkc2VsZWN0ID0gJCh0aGlzKTtcbiAgICAgICAgc2VsZWN0SXRlbUhhbmRsZXIoJHNlbGVjdCwgY29tcGFuaWVzKTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvKiBEaXNwbGF5IGFkZHJlc3NlcyBuZWFyIHRoZSBtYXAgKi9cbiAgICBjb25zdCByZW5kZXJJdGVtc0luTWFwID0gKHtsb2dvLCB0aXRsZSwgZGVsaXZlcnlUaW1lLCBjb29yZGluYXRlc30sICRwbGFjZUZvclJlbmRlciwgY291bnQpID0+IHtcbiAgICAgIGNvbnN0IHRlbXBsYXRlID0gJCgnLmpzLXNlbGVjdC1tYXAtaXRlbS10ZW1wbGF0ZScpLmh0bWwoKTtcbiAgICAgIGNvbnN0ICRpdGVtID0gJCh0ZW1wbGF0ZSkuY2xvbmUoKTtcbiAgICAgIGNvbnN0ICRyYWRpbyA9ICRpdGVtLmZpbmQoJy5qcy1zZWxlY3QtaXRlbS1yYWRpbycpO1xuICAgICAgaWYgKGNvdW50ID09PSAxKSAkcmFkaW8ucHJvcCgnY2hlY2tlZCcsIHRydWUpIC8vZGVmYXVsdCBjaGVja2VkXG4gICAgICAkcmFkaW8uYXR0cignaWQnLCBjb3VudCk7XG4gICAgICAkcmFkaW8uYXR0cignZGF0YS10aXRsZScsIHRpdGxlKTtcbiAgICAgICRyYWRpby5hdHRyKCdkYXRhLWRlbGl2ZXJ5VGltZScsIGRlbGl2ZXJ5VGltZSk7XG4gICAgICAkcmFkaW8uYXR0cignZGF0YS1jb29yZGluYXRlcycsIGNvb3JkaW5hdGVzKTtcbiAgICAgICRyYWRpby5wcm9wKCd2YWx1ZScsIHRpdGxlKTtcblxuICAgICAgJGl0ZW0uZmluZCgnLmpzLXNlbGVjdC1pdGVtLWltYWdlJykuYXR0cignc3JjJywgYCR7bG9nb31gKTtcbiAgICAgICRpdGVtLmZpbmQoJy5qcy1zZWxlY3QtaXRlbS10aXRsZScpLnRleHQodGl0bGUpO1xuICAgICAgJGl0ZW0uZmluZCgnLmpzLXNlbGVjdC1pdGVtLWRlbGl2ZXJ5VGltZScpLnRleHQoZGVsaXZlcnlUaW1lKTtcblxuICAgICAgJHBsYWNlRm9yUmVuZGVyLmFwcGVuZCgkaXRlbSk7XG4gICAgfVxuXG4gICAgLyogV2UgZ2V0IHRoZSBjb29yZGluYXRlcyB0aHJvdWdoIHRoZSBkYXRlIGF0dHJpYnV0ZSBpbiB0aGUgZm9ybWF0OiAnc3RyLCBzdHInLiBcbiAgICAgIFdlIG5lZWQgYW4gYXJyYXkgaW4gdGhlIGZvcm1hdDogW251bSwgbnVtXSAqL1xuICAgIGNvbnN0IGNvbnZlcnRTdHJpbmdzVG9OdW1iZXJzSW5BcnJheSA9IChzdHIpID0+IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHN0ci5zcGxpdCgnLCcpLm1hcChpdGVtID0+ICtpdGVtKTtcbiAgICAgIFxuICAgICAgcmV0dXJuIHJlc3VsdFxuICAgIH1cblxuICAgIC8qIFRoZSBmdW5jdGlvbiBjb2xsZWN0cyBhbGwgdGhlIGNvb3JkaW5hdGVzIGluIGFuIGFycmF5LCB0aGVuIHRvIHBhc3MgdGhlbSBpbnRvIGEgZnVuY3Rpb24gdG8gZGlzcGxheSBvbiB0aGUgbWFwICovXG4gICAgY29uc3QgY29sbGVjdFBpbnMgPSAoKSA9PiB7XG4gICAgICBjb25zdCAkcmFkaW9zID0gJCgnLmpzLXNlbGVjdC1tYXAtcmFkaW8nKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IFtdOyAvL2ZpbmFsIGFycmF5IHdpdGggQUxMIGNvb3JkaW5hdGVzXG4gICAgICBcbiAgICAgICRyYWRpb3MuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc3QgJHJhZGlvID0gJCh0aGlzKTtcbiAgICAgICAgY29uc3QgaWQgPSAkcmFkaW8uYXR0cignaWQnKTtcbiAgICAgICAgY29uc3QgdGl0bGUgPSAkcmFkaW8uZGF0YSgndGl0bGUnKTtcbiAgICAgICAgY29uc3QgZGVsaXZlcnlUaW1lID0gJHJhZGlvLmRhdGEoJ2RlbGl2ZXJ5VGltZScpO1xuICAgICAgICBjb25zdCBjb29yZGluYXRlcyA9IGNvbnZlcnRTdHJpbmdzVG9OdW1iZXJzSW5BcnJheSgkcmFkaW8uZGF0YSgnY29vcmRpbmF0ZXMnKSk7XG4gICAgICAgIHJlc3VsdC5wdXNoKHtpZCwgdGl0bGUsIGRlbGl2ZXJ5VGltZSwgY29vcmRpbmF0ZXN9KTtcbiAgICAgIH0pO1xuXG4gICAgICB3aW5kb3cucGlucyA9IHJlc3VsdDtcblxuICAgICAgcmV0dXJuIHJlc3VsdDsgLy8gW3suLi59LCB7Li4ufSwgey4uLn1dXG4gICAgfTtcblxuICAgIC8qIEZ1bmN0aW9uIGZvciBkaXNwbGF5aW5nIG1hcmtzIG9uIGEgbWFwICovXG4gICAgY29uc3QgcmVuZGVyUGxhY2VtYXJrcyA9IChtYXAsIHltYXBzLCBwaW5zKSA9PiB7XG4gICAgICBjb25zdCBCYWxsb29uQ29udGVudExheW91dCA9IHltYXBzLnRlbXBsYXRlTGF5b3V0RmFjdG9yeS5jcmVhdGVDbGFzcyhcbiAgICAgICAgJzxkaXYgY2xhc3M9XCJwaW5cIiBzdHlsZT1cIndpZHRoOiAyMjBweDsgcGFkZGluZzogMTBweDtcIj4nICtcbiAgICAgICAgICAgICc8cD57e3Byb3BlcnRpZXMudGl0bGV9fSB7e3Byb3BlcnRpZXMuZGVsaXZlcnlUaW1lfX08L3A+JyArXG4gICAgICAgICAgICAnPGJ1dHRvbiBkYXRhLWlkPVwie3twcm9wZXJ0aWVzLmlkfX1cIiBjbGFzcz1cImpzLXBpbi1idXR0b25cIj4g0JLRi9Cx0YDQsNGC0YwgPC9idXR0b24+JyArXG4gICAgICAgICc8L2Rpdj4nLCB7XG5cbiAgICAgICAgLy8g0J/QtdGA0LXQvtC/0YDQtdC00LXQu9GP0LXQvCDRhNGD0L3QutGG0LjRjiBidWlsZCwg0YfRgtC+0LHRiyDQv9GA0Lgg0YHQvtC30LTQsNC90LjQuCDQvNCw0LrQtdGC0LAg0L3QsNGH0LjQvdCw0YLRjFxuICAgICAgICAvLyDRgdC70YPRiNCw0YLRjCDRgdC+0LHRi9GC0LjQtSBjbGljayDQvdCwINC60L3QvtC/0LrQtS3RgdGH0LXRgtGH0LjQutC1LlxuICAgICAgICBidWlsZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIC8vINCh0L3QsNGH0LDQu9CwINCy0YvQt9GL0LLQsNC10Lwg0LzQtdGC0L7QtCBidWlsZCDRgNC+0LTQuNGC0LXQu9GM0YHQutC+0LPQviDQutC70LDRgdGB0LAuXG4gICAgICAgICAgQmFsbG9vbkNvbnRlbnRMYXlvdXQuc3VwZXJjbGFzcy5idWlsZC5jYWxsKHRoaXMpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vINCQINC30LDRgtC10Lwg0LLRi9C/0L7Qu9C90Y/QtdC8INC00L7Qv9C+0LvQvdC40YLQtdC70YzQvdGL0LUg0LTQtdC50YHRgtCy0LjRjy5cbiAgICAgICAgICAkKCcuanMtcGluLWJ1dHRvbicpLmJpbmQoJ2NsaWNrJywgdGhpcy5vbkNvdW50ZXJDbGljayk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy8g0JDQvdCw0LvQvtCz0LjRh9C90L4g0L/QtdGA0LXQvtC/0YDQtdC00LXQu9GP0LXQvCDRhNGD0L3QutGG0LjRjiBjbGVhciwg0YfRgtC+0LHRiyDRgdC90Y/RgtGMXG4gICAgICAgIC8vINC/0YDQvtGB0LvRg9GI0LjQstCw0L3QuNC1INC60LvQuNC60LAg0L/RgNC4INGD0LTQsNC70LXQvdC40Lgg0LzQsNC60LXRgtCwINGBINC60LDRgNGC0YsuXG4gICAgICAgIGNsZWFyOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgLy8g0JLRi9C/0L7Qu9C90Y/QtdC8INC00LXQudGB0YLQstC40Y8g0LIg0L7QsdGA0LDRgtC90L7QvCDQv9C+0YDRj9C00LrQtSAtINGB0L3QsNGH0LDQu9CwINGB0L3QuNC80LDQtdC8INGB0LvRg9GI0LDRgtC10LvRjyxcbiAgICAgICAgICAvLyDQsCDQv9C+0YLQvtC8INCy0YvQt9GL0LLQsNC10Lwg0LzQtdGC0L7QtCBjbGVhciDRgNC+0LTQuNGC0LXQu9GM0YHQutC+0LPQviDQutC70LDRgdGB0LAuXG4gICAgICAgICAgJCgnLmpzLXBpbi1idXR0b24nKS51bmJpbmQoJ2NsaWNrJywgdGhpcy5vbkNvdW50ZXJDbGljayk7XG4gICAgICAgICAgQmFsbG9vbkNvbnRlbnRMYXlvdXQuc3VwZXJjbGFzcy5jbGVhci5jYWxsKHRoaXMpO1xuICAgICAgICB9LFxuXG4gICAgICAgIG9uQ291bnRlckNsaWNrOiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgIGNvbnN0IGlkID0gJCgnLmpzLXBpbi1idXR0b24nKS5kYXRhKCdpZCcpO1xuICAgICAgICAgICQoYCMke2lkfWApLnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICBjb25zb2xlLmxvZygkKGAjJHtpZH1gKS52YWwoKSk7XG4gICAgICAgICAgbWFwLmJhbGxvb24uY2xvc2UoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cblxuICAgICAgZm9yIChsZXQgcGluIG9mIHBpbnMpIHtcbiAgICAgICAgY29uc3Qge2lkLCB0aXRsZSwgZGVsaXZlcnlUaW1lLCBjb29yZGluYXRlc30gPSBwaW47XG4gICAgICAgIFxuICAgICAgICBjb25zdCBwbGFjZW1hcmsgPSBuZXcgeW1hcHMuUGxhY2VtYXJrKGNvb3JkaW5hdGVzLCB7XG4gICAgICAgICAgaWQsIHRpdGxlLCBkZWxpdmVyeVRpbWVcbiAgICAgICAgfSx7XG4gICAgICAgICAgYmFsbG9vbkNvbnRlbnRMYXlvdXQ6IEJhbGxvb25Db250ZW50TGF5b3V0LFxuICAgICAgICAgIC8vINCX0LDQv9GA0LXRgtC40Lwg0LfQsNC80LXQvdGDINC+0LHRi9GH0L3QvtCz0L4g0LHQsNC70YPQvdCwINC90LAg0LHQsNC70YPQvS3Qv9Cw0L3QtdC70YwuXG4gICAgICAgICAgLy8g0JXRgdC70Lgg0L3QtSDRg9C60LDQt9GL0LLQsNGC0Ywg0Y3RgtGDINC+0L/RhtC40Y4sINC90LAg0LrQsNGA0YLQsNGFINC80LDQu9C10L3RjNC60L7Qs9C+INGA0LDQt9C80LXRgNCwINC+0YLQutGA0L7QtdGC0YHRjyDQsdCw0LvRg9C9LdC/0LDQvdC10LvRjC5cbiAgICAgICAgICBiYWxsb29uUGFuZWxNYXhNYXBBcmVhOiAwLFxuICAgICAgICAgIGljb25MYXlvdXQ6ICdkZWZhdWx0I2ltYWdlJyxcbiAgICAgICAgICBpY29uSW1hZ2VIcmVmOiAnLi4vaW1hZ2VzL3Bpbi5wbmcnLFxuICAgICAgICAgIGljb25JbWFnZVNpemU6IFszMCwgMzddLFxuICAgICAgIH0pO1xuICAgICAgICBtYXAuZ2VvT2JqZWN0cy5hZGQocGxhY2VtYXJrKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLyogSWYgY2hlY2tlZCA9IHRydWUgd2l0aCByYWRpbywgbW92ZSB0aGUgbWFwIHRvIHRoZSBhZGRyZXNzIGxhYmVsIHNwZWNpZmllZCBpbiByYWRpbyAqL1xuICAgIGNvbnN0IGFkZHJlc3Nlc09uQ2hhZ25lSGFuZGxlciA9IChtYXAsIHBpbnMpID0+IHsgLyogW3suLi59LCB7Li4ufSwgey4uLn1dICovXG4gICAgICBmb3IgKGxldCBpID0gMCwgbGVuZ3RoID0gcGlucy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCB7aWQsIGNvb3JkaW5hdGVzfSA9IHBpbnNbaV07XG4gICAgICAgIGNvbnN0ICRyYWRpbyA9ICQoYCMke2lkfWApO1xuICAgICAgICAkcmFkaW8ub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICBtYXAucGFuVG8oXG4gICAgICAgICAgICAvLyDQmtC+0L7RgNC00LjQvdCw0YLRiyDQvdC+0LLQvtCz0L4g0YbQtdC90YLRgNCwINC60LDRgNGC0YtcbiAgICAgICAgICAgIGNvb3JkaW5hdGVzLCB7XG4gICAgICAgICAgICAgICAgLyog0J7Qv9GG0LjQuCDQv9C10YDQtdC80LXRidC10L3QuNGPOlxuICAgICAgICAgICAgICAgICAgINGA0LDQt9GA0LXRiNC40YLRjCDRg9C80LXQvdGM0YjQsNGC0Ywg0Lgg0LfQsNGC0LXQvCDRg9Cy0LXQu9C40YfQuNCy0LDRgtGMINC30YPQvFxuICAgICAgICAgICAgICAgICAgINC60LDRgNGC0Ysg0L/RgNC4INC/0LXRgNC10LzQtdGJ0LXQvdC40Lgg0LzQtdC20LTRgyDRgtC+0YfQutCw0LzQuCBcbiAgICAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgICAgIGZseWluZzogdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICApXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8qIEdyb3VwIDIgZnVuY3Rpb25zIGZvciByZS11c2UgKi9cbiAgICBjb25zdCBhZGROZXdQbGFjZW1hcmtzQW5kSGFuZGxlcnMgPSAoKSA9PiB7XG4gICAgICAvLyByZW1vdmUgYWxsIHByZXZpb3VzIHBpbnNcbiAgICAgIHdpbmRvdy5tYXAuZ2VvT2JqZWN0cy5yZW1vdmVBbGwoKTtcbiAgICAgIC8vIGNvbnN0IHtwaW5zLCB5bWFwcywgbWFwfSA9IHdpbmRvdztcbiAgICAgIGNvbGxlY3RQaW5zKCk7XG4gICAgICByZW5kZXJQbGFjZW1hcmtzKHdpbmRvdy5tYXAsIHdpbmRvdy55bWFwcywgd2luZG93LnBpbnMpO1xuICAgICAgYWRkcmVzc2VzT25DaGFnbmVIYW5kbGVyKHdpbmRvdy5tYXAsIHdpbmRvdy5waW5zKTtcbiAgICB9XG5cbiAgICBjb25zdCByZW5kZXJNYXAgPSAoKSA9PiB7XG4gICAgICB5bWFwcy5yZWFkeShpbml0KTtcbiAgICAgIGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgICAgICQoJyNtYXAnKS5yZW1vdmVDbGFzcygnaXMtbG9hZGluZycpO1xuXG4gICAgICAgIGxldCBtYXAgPSBuZXcgeW1hcHMuTWFwKFwibWFwXCIsIHtcbiAgICAgICAgICAgIGNlbnRlcjogWzQ1LjA0MDIxNiwgMzguOTc1OTk2XSxcbiAgICAgICAgICAgIHpvb206IDEyXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHdpbmRvdy55bWFwcyA9IHltYXBzO1xuICAgICAgICB3aW5kb3cubWFwID0gbWFwO1xuXG4gICAgICAgIC8vIG1hcC5iZWhhdmlvcnMuZGlzYWJsZShbJ3Njcm9sbFpvb20nLCAnbXVsdGlUb3VjaCcsICdkcmFnJ10pO1xuICAgICAgICBtYXAuYmVoYXZpb3JzLmRpc2FibGUoWydzY3JvbGxab29tJ10pO1xuICAgICAgICBhZGROZXdQbGFjZW1hcmtzQW5kSGFuZGxlcnMoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvKiBGdW5jdGlvbiB3aGljayBjb21iaW5lIGFub3RoZXIgZnVuY3Rpb24gdG8gcmVuZGVyIHNlbGVjdCBhbmQgaGltIHBhcnRzICovXG4gICAgY29uc3QgZGVmYXVsdFJlbmRlciA9IChjb21wYW5pZXMpID0+IHtcbiAgICAgIHJlbmRlckN1cnJlbnRJdGVtKGNvbXBhbmllcy5zZGVrKTsgLy9kZWZhdWx0IHZpZXdcbiAgICAgIHJlbmRlckxpc3QoY29tcGFuaWVzLCAkKCcuanMtcmVuZGVyLWxpc3QtaXRlbXMnKSwgcmVuZGVyU2VsZWN0SXRlbSk7XG4gICAgICBpbml0U2VsZWN0cyhjb21wYW5pZXMpO1xuICAgICAgcmVuZGVyTWFwKCk7XG4gICAgfVxuICAgIFxuICAgIC8qIERlZmF1bHQgcmVxdWVzdCBhZnRlciBwYWdlIGxvYWRpbmcgKi9cbiAgICBjb25zdCBkZWZhdWx0QWpheFJlcXVlc3QgPSAodHlwZSkgPT4ge1xuICAgICAgY29uc3QgZGVmYXVsdFR5cGUgPSAnYnloaW1zZWxmJ1xuXG4gICAgICAkLmFqYXgoe1xuICAgICAgICB1cmw6IGBodHRwOi8vMTI3LjAuMC4xOjMwMDFgLFxuICAgICAgICBzdWNjZXNzOiAoY29tcGFuaWVzKSA9PiB7XG4gICAgICAgICAgd2luZG93LmNvbXBhbmllcyA9IGNvbXBhbmllcztcbiAgICAgICAgICBkZWZhdWx0UmVuZGVyKHdpbmRvdy5jb21wYW5pZXNbZGVmYXVsdFR5cGVdKTtcbiAgICAgICAgfSxcbiAgICAgICAgZXJyb3I6IChlcnJvcikgPT4ge1xuICAgICAgICAgIGNvbnNvbGUubG9nKGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIGRlZmF1bHRBamF4UmVxdWVzdCgpO1xuICB9XG59KSgpOyIsIjsoZnVuY3Rpb24oKSB7XG4gIGNvbnN0ICRtYXAgPSAkKCcuanMtY29udGFjdC1tYXAnKTtcblxuICBpZiAoJG1hcC5sZW5ndGgpIHtcbiAgICBjb25zdCBpbml0TWFwID0gKCkgPT4ge1xuICAgICAgeW1hcHMucmVhZHkoaW5pdCk7XG4gICAgICBmdW5jdGlvbiBpbml0KCkge1xuICAgICAgICAkKCcjbWFwJykucmVtb3ZlQ2xhc3MoJ2lzLWxvYWRpbmcnKTtcblxuICAgICAgICBsZXQgbWFwID0gbmV3IHltYXBzLk1hcChcIm1hcFwiLCB7XG4gICAgICAgICAgICBjZW50ZXI6IFs1My4zMzMxLDgzLjc4NjldLFxuICAgICAgICAgICAgem9vbTogMTZcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbGV0IHBsYWNlbWFyayA9IG5ldyB5bWFwcy5QbGFjZW1hcmsoWzUzLjMzMzEsODMuNzg2OV0sIHtcbiAgICAgICAgICBvcGVuQmFsbG9vbk9uQ2xpY2s6IGZhbHNlLFxuICAgICAgICAgIGN1cnNvcjogJ2RlZmF1bHQnXG4gICAgICAgIH0sIHtcbiAgICAgICAgICBpY29uTGF5b3V0OiAnZGVmYXVsdCNpbWFnZScsXG4gICAgICAgICAgaWNvbkltYWdlSHJlZjogJy4uL2ltYWdlcy9waW4ucG5nJyxcbiAgICAgICAgICBpY29uSW1hZ2VTaXplOiBbMzAsIDM3XSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbWFwLmJlaGF2aW9ycy5kaXNhYmxlKFsnc2Nyb2xsWm9vbSddKTtcblxuICAgICAgICBtYXAuZ2VvT2JqZWN0cy5hZGQocGxhY2VtYXJrKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpbml0TWFwKCk7XG4gIH1cblxufSkoKTsiLCI7KGZ1bmN0aW9uKCkge1xuICBjb25zdCBjb250YWluZXJzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmpzLWN1c3RvbS1ob3Jpem9udGFsLXNjcm9sbCcpO1xuXG4gIGNvbnRhaW5lcnMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgd2hlZWxQcm9wYWdhdGlvbjogZmFsc2VcbiAgICB9O1xuICAgIGNvbnN0IGNvbnRhaW5lciA9IG5ldyBQZXJmZWN0U2Nyb2xsYmFyKGVsZW1lbnQsIG9wdGlvbnMpO1xuICB9KTsgXG59KSgpOyIsIjsoZnVuY3Rpb24oKSB7XG4gIGNvbnN0IGNvbnRhaW5lcnMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuanMtY3VzdG9tLXZlcnRpY2FsLXNjcm9sbCcpO1xuXG4gIGNvbnRhaW5lcnMuZm9yRWFjaChlbGVtZW50ID0+IHtcbiAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgd2hlZWxQcm9wYWdhdGlvbjogZmFsc2VcbiAgICB9O1xuICAgIGNvbnN0IGNvbnRhaW5lciA9IG5ldyBQZXJmZWN0U2Nyb2xsYmFyKGVsZW1lbnQsIG9wdGlvbnMpO1xuXG4gIH0pO1xufSkoKTsiLCI7KGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgY29uc3QgJGZpbHRlciA9ICQoJ1tqcy1maWx0ZXJdJyk7XG5cbiAgaWYgKCRmaWx0ZXIubGVuZ3RoKSB7XG4gICAgY29uc3QgJHRvZ2dsZSA9ICRmaWx0ZXIuZmluZCgnW2pzLWZpbHRlci10b2dnbGVdJyk7XG4gICAgY29uc3QgJGxpc3QgPSAkZmlsdGVyLmZpbmQoJ1tqcy1maWx0ZXItbGlzdF0nKTtcbiAgICAvKiBTaG93L0hpZGUgbGlzdCB3aXRoIGZpbGVycyAqL1xuICAgIGNvbnN0IHRvZ2dsZUhhbmRsZXIgPSAoZXZlbnQpID0+IHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAkdG9nZ2xlLnRvZ2dsZUNsYXNzKCdpcy1hY3RpdmUnKTtcbiAgICAgICRsaXN0LnNsaWRlVG9nZ2xlKCk7XG4gICAgfTtcbiAgICAkdG9nZ2xlLm9mZignY2xpY2suZmlsdGVyJykub24oJ2NsaWNrLmZpbHRlcicsIHRvZ2dsZUhhbmRsZXIpO1xuXG5cbiAgICBjb25zdCAkYnV0dG9uID0gJGZpbHRlci5maW5kKCdbanMtZmlsdGVyLWJ1dHRvbl0nKTtcbiAgICBjb25zdCAkaW5wdXRzID0gJGZpbHRlci5maW5kKCdpbnB1dCcpO1xuXG4gICAgY29uc3QgY2FsY3VsYXRlUG9zaXRpb25Ub3AgPSAoJGlucHV0KSA9PiB7XG4gICAgICBjb25zdCBpbnB1dFBhZ2VZID0gJGlucHV0Lm9mZnNldCgpLnRvcDtcbiAgICAgIGNvbnN0IGxpc3RQYWdlWSA9ICRsaXN0Lm9mZnNldCgpLnRvcDtcbiAgICAgIGNvbnN0IGJ1dHRvbkhlaWdodCA9ICRidXR0b24ub3V0ZXJIZWlnaHQoKTtcbiAgICAgIHJldHVybiBpbnB1dFBhZ2VZIC0gbGlzdFBhZ2VZIC0gYnV0dG9uSGVpZ2h0IC8gMjtcbiAgICB9O1xuXG5cbiAgICBjb25zdCBzaG93QnV0dG9uID0gKCkgPT4ge1xuICAgICAgY29uc3QgY2hlY2tlZEVsZW1zID0gJGZpbHRlci5maW5kKCdpbnB1dDpjaGVja2VkJykubGVuZ3RoO1xuICAgICAgaWYgKCFjaGVja2VkRWxlbXMpIHtcbiAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnaXMtYWN0aXZlJyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgICAgXG4gICAgICAkYnV0dG9uLmFkZENsYXNzKCdpcy1hY3RpdmUnKTtcbiAgICAgIHJldHVybiBjaGVja2VkRWxlbXM7XG4gICAgfTtcblxuICAgICRpbnB1dHMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICBjb25zdCAkaW5wdXQgPSAkKHRoaXMpO1xuICAgICAgY29uc3QgaW5wdXRDbGlja0hhbmRsZXIgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgY29uc3QgJHRhcmdldCA9ICQodGhpcyk7XG4gICAgICAgICRidXR0b24uY3NzKHt0b3A6IGNhbGN1bGF0ZVBvc2l0aW9uVG9wKCR0YXJnZXQpfSk7XG4gICAgICAgIGNvbnNvbGUubG9nKHNob3dCdXR0b24oKSk7XG4gICAgICB9O1xuXG4gICAgICAkaW5wdXQub2ZmKCdjbGljay5idXR0b24nKS5vbignY2xpY2suYnV0dG9uJywgaW5wdXRDbGlja0hhbmRsZXIpO1xuICAgIH0pO1xuICB9XG59KSgpOyIsIjsoZnVuY3Rpb24gKCl7XG4gICd1c2Ugc3RyaWN0JztcbiAgY29uc3QgJGxpc3RzID0gJCgnW2pzLWZpbHRlci1saXN0XScpO1xuXG4gIGlmICgkbGlzdHMubGVuZ3RoKSB7XG4gICAgJGxpc3RzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgY29uc3QgJHRvZ2dsZSA9ICQoJ1tqcy1maWx0ZXItdG9nZ2xlXScpO1xuICAgICAgY29uc3QgJGxpc3QgPSAkKHRoaXMpO1xuXG4gICAgICBjb25zdCBjbGlja0hhbmRsZXIgPSAoZXZuZXQpID0+IHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgJHRvZ2dsZS50b2dnbGVDbGFzcygnaXMtYWN0aXZlJyk7XG4gICAgICAgICRsaXN0LnNsaWRlVG9nZ2xlKCk7XG4gICAgICB9XG4gICAgICAkdG9nZ2xlLm9mZignY2xpY2suZmlsdGVyJykub24oJ2NsaWNrLmZpbHRlcicsIGNsaWNrSGFuZGxlcik7XG4gICAgfSk7XG4gIH1cbn0pKCk7IiwiLyogOyhmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICBjb25zdCAkZm9ybXMgPSAkKCdbanMtZm9ybV0nKTtcblxuICBpZiAoJGZvcm1zLmxlbmd0aCkge1xuXG4gICAgY29uc3QgbWFza3MgPSB7XG4gICAgICB0ZWw6ICcrNyAoOTk5KSAtIDk5OSAtIDk5OTknLFxuICAgICAgdGV4dDogJ1thLXpBLVrQkC3Qr9CwLdGPIF0qJ1xuICAgIH1cblxuICAgICRmb3Jtcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgIGNvbnN0ICRmb3JtID0gJCh0aGlzKTtcbiAgICAgIGNvbnN0IHBvcHVwSWQgPSAkZm9ybS5kYXRhKCdzcmMnKTtcbiAgICAgIGNvbnN0ICRpbnB1dHMgPSAkZm9ybS5maW5kKCdpbnB1dCcpO1xuICAgICAgXG4gICAgICAkaW5wdXRzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zdCAkaW5wdXQgPSAkKHRoaXMpO1xuICAgICAgICBjb25zdCB0eXBlID0gJGlucHV0LmF0dHIoJ3R5cGUnKTtcblxuICAgICAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgICBjYXNlICd0ZWwnOlxuICAgICAgICAgICAgJGlucHV0LmlucHV0bWFzayh7XG4gICAgICAgICAgICAgIG1hc2s6IG1hc2tzLnRlbCxcbiAgICAgICAgICAgICAgYXV0b1VubWFzazogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICd0ZXh0JzogXG4gICAgICAgICAgICAkaW5wdXQuaW5wdXRtYXNrKHtyZWdleDogbWFza3MudGV4dH0pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICRpbnB1dC5pbnB1dG1hc2soKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgICRmb3JtLm9uKCdzdWJtaXQnLCAoZXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHZhbGlkYXRpb24gPSBbXTtcbiAgICAgICAgJGlucHV0cy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGNvbnN0ICRpbnB1dCA9ICQodGhpcyk7XG4gICAgICAgICAgXG4gICAgICAgICAgaWYgKCRpbnB1dC5pbnB1dG1hc2soJ2lzQ29tcGxldGUnKSkge1xuICAgICAgICAgICAgdmFsaWRhdGlvbi5wdXNoKCRpbnB1dC5pbnB1dG1hc2soJ2lzQ29tcGxldGUnKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAodmFsaWRhdGlvbi5sZW5ndGggPT09ICRpbnB1dHMubGVuZ3RoKSB7XG4gICAgICAgICAgJC5mYW5jeWJveC5vcGVuKHtcbiAgICAgICAgICAgIHNyYzogJGZvcm0uZGF0YSgnc3JjJyksXG4gICAgICAgICAgICB0eXBlOiAnaW5saW5lJyxcbiAgICAgICAgICAgIG9wdHM6IHtcbiAgICAgICAgICAgICAgY2xvc2VFeGlzdGluZzogdHJ1ZSxcbiAgICAgICAgICAgICAgdG91Y2g6IHRydWUsXG4gICAgICAgICAgICAgIGJ0blRwbCA6IHtcbiAgICAgICAgICAgICAgICBzbWFsbEJ0biA6ICcnXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn0pKCk7XG4gKi8iLCI7KGZ1bmN0aW9uKCkge1xuICBjb25zdCAkYm9keSA9ICQoJ2JvZHknKTtcbiAgY29uc3QgJGhlYWRlciA9ICQoJy5ib2R5X19oZWFkZXInKTtcbiAgY29uc3QgJHZpc2libGVSb3cgPSAkaGVhZGVyLmZpbmQoJy5oZWFkZXItbWlkJyk7XG4gIGNvbnN0IGhlYWRlckhlaWdodCA9ICRoZWFkZXIub3V0ZXJIZWlnaHQoKTtcblxuICBjb25zdCBzY3JvbGxIYW5sZGVyID0gKCkgPT4ge1xuICAgIGlmICgkKHdpbmRvdykuc2Nyb2xsVG9wKCkgPiBoZWFkZXJIZWlnaHQpIHtcbiAgICAgICRib2R5LmNzcyh7J3BhZGRpbmctdG9wJzogaGVhZGVySGVpZ2h0fSk7XG4gICAgICAkaGVhZGVyLmFkZENsYXNzKCdpcy1zY3JvbGxpbmcnKTtcbiAgICAgICR2aXNpYmxlUm93LmFkZENsYXNzKCdpcy1vbmx5Jyk7XG4gICAgfVxuXG4gICAgaWYgKCQod2luZG93KS5zY3JvbGxUb3AoKSA8IGhlYWRlckhlaWdodCkge1xuICAgICAgJGJvZHkuY3NzKHsncGFkZGluZy10b3AnOiAwfSk7XG4gICAgICAkaGVhZGVyLnJlbW92ZUNsYXNzKCdpcy1zY3JvbGxpbmcnKTtcbiAgICAgICR2aXNpYmxlUm93LnJlbW92ZUNsYXNzKCdpcy1vbmx5Jyk7XG4gICAgfVxuICB9O1xuICAkKHdpbmRvdykuc2Nyb2xsKHNjcm9sbEhhbmxkZXIpO1xufSkoKTsiLCI7KGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgY29uc3QgJGNvbnRhaW5lciA9ICQoJ1tqcy1tZXJpdHNdJyk7XG5cbiAgaWYgKCRjb250YWluZXIubGVuZ3RoKSB7XG4gICAgY29uc3QgJGJ1dHRvbnMgPSAkKCdbanMtbWVyaXQtYnV0dG9uXScpO1xuICAgIGxldCAkcHJldmlvdXNCdXR0b24gPSBudWxsO1xuICAgIFxuICAgICRidXR0b25zLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICBjb25zdCAkYnV0dG9uID0gJCh0aGlzKTtcbiAgICAgIGNvbnN0ICRkaXNwbGF5ID0gJGNvbnRhaW5lci5maW5kKCdbanMtbWVyaXQtZGlzcGxheV0nKTtcbiAgICAgIGNvbnN0ICR0aXRsZSA9ICRkaXNwbGF5LmZpbmQoJ1tqcy1tZXJpdC10aXRsZV0nKTtcbiAgICAgIGNvbnN0ICRwYXJhZ3JhcGggPSAkZGlzcGxheS5maW5kKCdwJyk7XG5cbiAgICAgIGNvbnN0IGNoZWNrUHJldmlvdXNCdXR0b24gPSAoJHRhcmdldCkgPT4ge1xuICAgICAgICAvKiBpZiBpdCBudWxsICovXG4gICAgICAgIGlmICghJHByZXZpb3VzQnV0dG9uKSB7XG4gICAgICAgICAgJHRhcmdldC5hZGRDbGFzcygnaXMtYWN0aXZlJyk7XG4gICAgICAgICAgJHByZXZpb3VzQnV0dG9uID0gJHRhcmdldDtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIGlmIHRoZW0gc2FtZVxuICAgICAgICBpZiAoJHByZXZpb3VzQnV0dG9uID09PSAkdGFyZ2V0KSByZXR1cm47XG5cbiAgICAgICAgLy8gaWYgdGhlbSB2YXJpb3VzXG4gICAgICAgIGlmICgkcHJldmlvdXNCdXR0b24gIT09ICR0YXJnZXQpIHtcbiAgICAgICAgICAkcHJldmlvdXNCdXR0b24ucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuICAgICAgICAgICR0YXJnZXQuYWRkQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuICAgICAgICAgICRwcmV2aW91c0J1dHRvbiA9ICR0YXJnZXQ7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc3QgY2xpY2tIYW5kbGVyID0gKGV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNvbnN0ICR0YXJnZXQgPSAkKHRoaXMpO1xuICAgICAgICBjaGVja1ByZXZpb3VzQnV0dG9uKCR0YXJnZXQpO1xuXG4gICAgICAgIGNvbnN0IHsgdGl0bGUsIHBhcmFncmFwaCB9ID0gJHRhcmdldC5kYXRhKCk7XG4gICAgICAgICR0aXRsZS5odG1sKGAke3RpdGxlfWApO1xuICAgICAgICAkcGFyYWdyYXBoLnRleHQocGFyYWdyYXBoKTtcbiAgICAgIH07XG5cbiAgICAgICRidXR0b24ub2ZmKCdjbGljay5tZXJpdCcpLm9uKCdjbGljay5tZXJpdCcsIGNsaWNrSGFuZGxlcik7XG4gICAgfSk7XG5cblxuICAgICQod2luZG93KS5yZXNpemUoKGV2ZW50KSA9PiB7XG4gICAgICBjb25zdCAkdmlld3BvcnQgPSAkKGV2ZW50LnRhcmdldCk7XG5cbiAgICAgIGlmICgkdmlld3BvcnQuaW5uZXJXaWR0aCgpIDwgOTkzKSB7XG4gICAgICAgICRidXR0b25zLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUnKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufSkoKTsiLCI7KGZ1bmN0aW9uKCkge1xuICBvYmplY3RGaXRJbWFnZXMoKTtcbn0pKCk7IiwiOyhmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICBjb25zdCAkc2NlbmVzID0gJCgnW2pzLXBhcmFsbGF4XScpO1xuXG4gIGlmICgkc2NlbmVzLmxlbmd0aCkge1xuICAgICRzY2VuZXMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIGNvbnN0ICRzY2VuZSA9ICQodGhpcyk7XG4gICAgICAkc2NlbmUucGFyYWxsYXhpZnkoe1xuICAgICAgICBwb3NpdGlvblByb3BlcnR5OiAndHJhbnNmb3JtJ1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn0oKSk7IiwiOyhmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICBjb25zdCAkYnV0dG9ucyA9ICQoJ1tqcy1wb3B1cC1vcGVuXScpO1xuXG4gIGlmICgkYnV0dG9ucy5sZW5ndGgpIHtcbiAgICBjb25zdCAkYm9keSA9ICQoJ2JvZHknKTtcbiAgICBjb25zdCAkc2Nyb2xsQmFyV2lkdGggPSAod2luZG93LmlubmVyV2lkdGggLSAkKHdpbmRvdykud2lkdGgoKSk7XG5cbiAgICAkYnV0dG9ucy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgY29uc3QgJGJ1dHRvbiA9ICQodGhpcyk7XG4gICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICBoaWRlU2Nyb2xsYmFyOiB0cnVlLFxuICAgICAgICB0b3VjaDogZmFsc2UsXG4gICAgICAgIGJ0blRwbCA6IHtcbiAgICAgICAgICBzbWFsbEJ0biA6ICcnXG4gICAgICAgIH0sXG4gICAgICAgIGJlZm9yZVNob3c6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIC8vICBBZGQgYW5vdGhlciBiZyBjb2xvclxuICAgICAgICAgICQoJy5mYW5jeWJveC1iZycpLmFkZENsYXNzKCRidXR0b24uZGF0YSgnc3JjJykuc2xpY2UoMSkpO1xuICAgICAgICAgIGNvbnN0ICRoZWFkZXIgPSAkYm9keS5maW5kKCcuYm9keV9faGVhZGVyJyk7XG5cbiAgICAgICAgICBjb25zdCBib2R5U3R5bGVzID0ge1xuICAgICAgICAgICAgJ292ZXJmbG93LXknOiAnaGlkZGVuJyxcbiAgICAgICAgICAgICdwYWRkaW5nLXJpZ2h0JzogYCR7JHNjcm9sbEJhcldpZHRofXB4YCxcbiAgICAgICAgICAgICdtYXJnaW4nOiAnMCBhdXRvJ1xuICAgICAgICAgIH07XG4gICAgICAgICAgJGJvZHkuY3NzKGJvZHlTdHlsZXMpO1xuXG4gICAgICAgICAgaWYgKCRoZWFkZXIuaGFzQ2xhc3MoJ2lzLXNjcm9sbGluZycpKSB7XG4gICAgICAgICAgICAkaGVhZGVyLmNzcyh7J3BhZGRpbmctcmlnaHQnOiBgJHskc2Nyb2xsQmFyV2lkdGh9cHhgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBhZnRlckNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAvLyAgQWRkIGFub3RoZXIgYmcgY29sb3JcbiAgICAgICAgICAkKCcuZmFuY3lib3gtYmcnKS5yZW1vdmVDbGFzcygkYnV0dG9uLmRhdGEoJ3NyYycpLnNsaWNlKDEpKTtcbiAgICAgICAgICBjb25zdCAkaGVhZGVyID0gJGJvZHkuZmluZCgnLmJvZHlfX2hlYWRlcicpO1xuXG4gICAgICAgICAgY29uc3QgYm9keVN0eWxlcyA9IHtcbiAgICAgICAgICAgICdvdmVyZmxvdy15JzogJ3Zpc2libGUnLFxuICAgICAgICAgICAgJ3BhZGRpbmctcmlnaHQnOiAwLFxuICAgICAgICAgICAgJ21hcmdpbic6IDBcbiAgICAgICAgICB9O1xuICAgICAgICAgICRib2R5LmNzcyhib2R5U3R5bGVzKTtcblxuICAgICAgICAgIGlmICgkaGVhZGVyLmhhc0NsYXNzKCdpcy1zY3JvbGxpbmcnKSkge1xuICAgICAgICAgICAgJGhlYWRlci5jc3MoeydwYWRkaW5nLXJpZ2h0JzogJyd9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgfVxuICAgICAgfTtcbiAgXG4gICAgICAkYnV0dG9uLmZhbmN5Ym94KG9wdGlvbnMpO1xuICAgIH0pO1xuICB9XG4gIFxufSgpKTtcbiIsIjsoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICBjb25zdCAkZmllbGRzID0gJCgnW2pzLWxheW91dF0nKTtcblxuICBpZiAoJGZpZWxkcy5sZW5ndGgpIHtcbiAgICAkZmllbGRzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICBjb25zdCAkZmllbGRDb250YWluZXIgPSAkKCdbanMtbGF5b3V0LWNvbnRhaW5lcl0nKTtcbiAgICAgIGNvbnN0ICRmaWVsZCA9ICQodGhpcyk7XG4gICAgICBjb25zdCAkbGFiZWwgPSAkZmllbGQucGFyZW50KCk7IC8vIHR5cGUgaXMgc3RvcmluZyBpbiB0aGUgbGFiZWxcbiAgICAgIGNvbnN0IHZpZXcgPSAkbGFiZWwuZGF0YSgndmlldycpO1xuXG4gICAgICAvKiBFbGVtZW50cyB3aWxsIHJlcHJlc2VudCB0aGVtIHNlbGYgdXNpbmcgYSBjc3MgY2xhc3MuICovXG4gICAgICBjb25zdCAkaXRlbXMgPSAkKCdbanMtY2F0YWxvZy1pdGVtXScpO1xuICAgICAgY29uc3QgJHByb2R1Y3RzID0gJCgnW2pzLXByb2R1Y3RdJyk7XG4gICAgICBjb25zdCAkbGlzdCA9ICQoJ1tqcy1wcm9kdWN0LWxpc3RdJyk7XG5cbiAgICAgIGNvbnN0IG9uQ2hhbmdlSGFuZGxlciA9ICgpID0+IHtcbiAgICAgICAgaWYgKHZpZXcgPT09ICdyb3cnKSB7XG4gICAgICAgICAgJGl0ZW1zLmFkZENsYXNzKCdpcy1mdWxsJyk7XG4gICAgICAgICAgJHByb2R1Y3RzLmFkZENsYXNzKCdpcy1yb3cnKTtcbiAgICAgICAgICAkbGlzdC5hZGRDbGFzcygncm93LXZpZXcnKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodmlldyA9PT0gJ2RlZmF1bHQnKSB7XG4gICAgICAgICAgaWYgKCRpdGVtcy5oYXNDbGFzcygnaXMtZnVsbCcpICYmICRwcm9kdWN0cy5oYXNDbGFzcygnaXMtcm93JykpIHtcbiAgICAgICAgICAgICRpdGVtcy5yZW1vdmVDbGFzcygnaXMtZnVsbCcpO1xuICAgICAgICAgICAgJHByb2R1Y3RzLnJlbW92ZUNsYXNzKCdpcy1yb3cnKTtcbiAgICAgICAgICAgICRsaXN0LnJlbW92ZUNsYXNzKCdyb3ctdmlldycpO1xuICAgICAgICAgICAgcmV0dXJuIDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm47IC8vIElmIHRoZSBsYXlvdXQgd2FzIGRlZmF1bHRcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgJGZpZWxkLm9mZignY2hhbmdlLmxheW91dCcpLm9uKCdjaGFuZ2UubGF5b3V0Jywgb25DaGFuZ2VIYW5kbGVyKTtcbiAgICBcbiAgICAgIGNvbnN0IHJlc2l6ZUhhbmRsZXIgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgY29uc3QgJG1heFZpZXdXaWR0aCA9IDExMTU7XG4gICAgICAgIGNvbnN0ICR0YXJnZXQgPSAkKGV2ZW50LnRhcmdldCk7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRWaWV3V2lkdGggPSAkdGFyZ2V0LmlubmVyV2lkdGgoKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChjdXJyZW50Vmlld1dpZHRoIDwgMTExNSkge1xuICAgICAgICAgICRwcm9kdWN0cy5yZW1vdmVDbGFzcygnaXMtcm93Jyk7XG4gICAgICAgICAgJGl0ZW1zLnJlbW92ZUNsYXNzKCdpcy1mdWxsJyk7XG4gICAgICAgICAgJGxpc3QucmVtb3ZlQ2xhc3MoJ3Jvdy12aWV3Jyk7XG4gICAgICAgICAgJGZpZWxkQ29udGFpbmVyLmFkZENsYXNzKCdpcy1oaWRkZW4nKTtcbiAgICAgICAgICAkKCdbZGF0YS12aWV3PVwiZGVmYXVsdFwiXScpLmZpbmQoJ2lucHV0JykucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGN1cnJlbnRWaWV3V2lkdGggPj0gMTExNSkge1xuICAgICAgICAgICRmaWVsZENvbnRhaW5lci5yZW1vdmVDbGFzcygnaXMtaGlkZGVuJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICB9O1xuICAgIFxuICAgICAgJCh3aW5kb3cpLnJlc2l6ZShyZXNpemVIYW5kbGVyKTtcbiAgICB9KTtcbiAgfVxufSgpKTsiLCI7KGZ1bmN0aW9uKCl7XG4gICd1c2Ugc3RyaWN0JztcblxuICBjb25zdCAkcmV2aWV3cyA9ICQoJ1tqcy1yZXZpZXddJyk7XG5cbiAgaWYgKCRyZXZpZXdzLmxlbmd0aCkge1xuICAgICRyZXZpZXdzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICBjb25zdCAkcmV2aWV3ID0gJCh0aGlzKTtcbiAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkcmV2aWV3LmZpbmQoJy5yZXZpZXdfX3dyYXBwZXInKTtcblxuICAgICAgY29uc3QgY2hlY2tPdmVyZmxvdyA9IChlbGVtZW50KSA9PiB7XG4gICAgICAgIGNvbnN0IGNoZWNrID0gKGVsZW1lbnRbMF0uc2Nyb2xsSGVpZ2h0ID4gZWxlbWVudC5pbm5lckhlaWdodCgpKT8gdHJ1ZTogZmFsc2U7XG4gICAgICAgIFxuICAgICAgICBjaGVjaz8gJHJldmlldy5hZGRDbGFzcygnaXMtb3ZlcmZsb3cnKTogbnVsbDtcbiAgICAgIH07XG5cbiAgICAgIGNoZWNrT3ZlcmZsb3coJGNvbnRhaW5lcik7XG4gICAgfSk7XG4gIH1cbn0oKSk7IiwiOyhmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGNvbnN0ICRzY3JvbGxzID0gJCgnW2pzLXNjcm9sbC11cF0nKTtcbiAgaWYgKCRzY3JvbGxzLmxlbmd0aCAhPSAwKSB7XG4gICAgJHNjcm9sbHMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIGNvbnN0ICRzY3JvbGwgPSAkKHRoaXMpO1xuICAgICAgXG4gICAgICAkKHdpbmRvdykuc2Nyb2xsKGhpZGVBbmNob3IpO1xuICAgICAgXG4gICAgICBmdW5jdGlvbiBoaWRlQW5jaG9yIChldmVudCkge1xuICAgICAgICBjb25zdCAkd2luZG93ID0gJCh0aGlzKTtcbiAgICAgICAgY29uc3Qgb25lVGhpcmREb2N1bWVudEhlaWdodCA9ICR3aW5kb3cuaGVpZ2h0KCkgLyAyOyBcblxuICAgICAgICBpZiAoJHdpbmRvdy5zY3JvbGxUb3AoKSA+PSBvbmVUaGlyZERvY3VtZW50SGVpZ2h0KSB7XG4gICAgICAgICAgJHNjcm9sbC5hZGRDbGFzcygnaXMtYWN0aXZlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgJHNjcm9sbC5yZW1vdmVDbGFzcygnaXMtYWN0aXZlJyk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgJHNjcm9sbC5vZmYoJ2NsaWNrLnNjcm9sbFVwJykub24oJ2NsaWNrLnNjcm9sbFVwJywgc2Nyb2xsKTtcblxuICAgICAgZnVuY3Rpb24gc2Nyb2xsKGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNvbnN0ICR0YXJnZXQgPSAkKGV2ZW50LiR0YXJnZXQpO1xuICAgICAgICAkKCdib2R5LGh0bWwnKS5hbmltYXRlKHtzY3JvbGxUb3A6MH0sODAwKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufSgpKTtcbiIsIjsoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgY29uc3QgJHNlbGVjdHM9ICQoJ1tqcy1zZWxlY3RdJyk7XG5cbiAgaWYgKCRzZWxlY3RzLmxlbmd0aCkge1xuICAgICRzZWxlY3RzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICBjb25zdCAkc2VsZWN0ID0gJCh0aGlzKTtcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgIC8vIHJlbW92ZSBzZWFyY2gtYm94XG4gICAgICAgIG1pbmltdW1SZXN1bHRzRm9yU2VhcmNoOiAtMSxcbiAgICAgICAgd2lkdGg6ICdyZXNvbHZlJ1xuICAgICAgfTtcblxuICAgICAgJHNlbGVjdC5zZWxlY3QyKG9wdGlvbnMpO1xuICAgIH0pO1xuICB9XG59KCkpOyIsIjsoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICBjb25zdCAkc2V0cyA9ICQoJ1tqcy1zZXRdJyk7XG4gIFxuICBpZiAoJHNldHMubGVuZ3RoKSB7XG4gICAgLyogQW4gZXZlbnQgaGFuZGxlciBmb3IgdGhlIGZ1bmN0aW9uIG9mIGNsb3NpbmcgLyBvcGVuaW5nIHNlcGFyYXRlIGdyb3VwcyBvZiBmaWVsZHMgaW4gdGhlIHNldC4gKi9cblxuICAgIC8vIGNvbnN0IHZpZXdXaWR0aCA9ICQoJ2JvZHknKS53aWR0aCgpO1xuICAgIFxuICAgICRzZXRzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICBjb25zdCAkc2V0ID0gJCh0aGlzKTtcbiAgICAgIGNvbnN0ICR0b2dnbGUgPSAkc2V0LmZpbmQoJ1tqcy1zZXQtdG9nZ2xlXScpO1xuICAgICAgLy8gJHRvZ2dsZS5hZGRDbGFzcygodmlld1dpZHRoID4gOTkyKT8gJ2lzLWFjdGl2ZSc6IG51bGwpO1xuXG4gICAgICBjb25zdCAkbGlzdCA9ICRzZXQuZmluZCgnW2pzLXNldC1saXN0XScpO1xuXG5cbiAgICAgIGNvbnN0IGNsaWNrSGFuZGxlciA9IChldm5ldCkgPT4ge1xuICAgICAgICAkdG9nZ2xlLnRvZ2dsZUNsYXNzKCdpcy1hY3RpdmUnKTtcbiAgICAgICAgJGxpc3Quc2xpZGVUb2dnbGUoKTtcbiAgICAgIH1cblxuICAgICAgJHRvZ2dsZS5vZmYoJ2NsaWNrLnNldCcpLm9uKCdjbGljay5zZXQnLCBjbGlja0hhbmRsZXIpO1xuICAgIH0pO1xuICB9XG59KSgpOyIsIjsoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgXG4gIGNvbnN0ICRuYXYgPSAkKCdbanMtc2l0ZS1uYXZpZ2F0aW9uXScpO1xuXG4gIGlmICgkbmF2Lmxlbmd0aCkge1xuICAgIGNvbnN0ICR0b2dnbGUgPSAkbmF2LmZpbmQoJ1tqcy1zaXRlLW5hdmlnYXRpb24tdG9nZ2xlXScpO1xuICAgIGNvbnN0ICRjb250YWluZXIgPSAkbmF2LmZpbmQoJ1tqcy1zaXRlLW5hdmlnYXRpb24tY29udGFpbmVyXScpO1xuXG4gICAgY29uc3QgY2xpY2tIYW5kbGVyID0gKCkgPT4ge1xuICAgICAgJHRvZ2dsZS50b2dnbGVDbGFzcygnaXMtYWN0aXZlJyk7XG4gICAgICAkY29udGFpbmVyLnNsaWRlVG9nZ2xlKCk7XG4gICAgfTtcblxuICAgICR0b2dnbGUub2ZmKCdjbGljay5zbGlkZU5hdicpLm9uKCdjbGljay5zbGlkZU5hdicsIGNsaWNrSGFuZGxlcik7XG4gIH1cbn0pKCk7IiwiOyhmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGNvbnN0ICRzbGlkZXJzID0gJCgnW2pzLXNpbXBsZS1zbGlkZXJdJyk7XG5cbiAgaWYgKCRzbGlkZXJzLmxlbmd0aCkge1xuICAgICRzbGlkZXJzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICBjb25zdCAkc2xpZGVyID0gJCh0aGlzKTtcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgIHNsaWRlc1RvU2hvdzogMSxcbiAgICAgICAgdXNlVHJhbnNmb3JtOiB0cnVlLFxuICAgICAgICBzcGVlZDogNDAwLFxuICAgICAgICBjc3NFYXNlOiAnY3ViaWMtYmV6aWVyKDAuNzcsIDAsIDAuMTgsIDEpJyxcbiAgICAgICAgYXJyb3dzOiBmYWxzZSxcbiAgICAgICAgZG90czogdHJ1ZSxcbiAgICAgICAgZG90c0NsYXNzOiAnc2xpZGVyX19kb3RzJyxcbiAgICAgICAgY3VzdG9tUGFnaW5nOiBmdW5jdGlvbihzbGlkZXIsIGkpIHtcbiAgICAgICAgICByZXR1cm4gJzxzcGFuIGNsYXNzPVwic2xpZGVyX19kb3RcIj48L3NwYW4+JztcbiAgICAgICAgfSxcbiAgICAgIH07XG5cbiAgICAgICRzbGlkZXIuc2xpY2sob3B0aW9ucyk7XG4gICAgfSk7XG4gIH1cbn0pKCk7IiwiOyhmdW5jdGlvbiAoKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICBjb25zdCAkZ29vZHMgPSAkKCdbanMtZ29vZF0nKTtcblxuICBpZiAoJGdvb2RzLmxlbmd0aCkge1xuICAgICRnb29kcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgIGNvbnN0ICRnb29kID0gJCh0aGlzKTtcblxuICAgICAgY29uc3QgJHNsaWRlclNpbmdsZSA9ICRnb29kLmZpbmQoJ1tqcy1zeW5jLXNsaWRlci1zaW5nbGVdJyk7XG5cbiAgICAgICRzbGlkZXJTaW5nbGUuc2xpY2soe1xuICAgICAgICBzbGlkZXNUb1Nob3c6IDEsXG4gICAgICAgIHNsaWRlc1RvU2Nyb2xsOiAxLFxuICAgICAgICBmYWRlOiBmYWxzZSxcbiAgICAgICAgaW5maW5pdGU6IGZhbHNlLFxuICAgICAgICB1c2VUcmFuc2Zvcm06IHRydWUsXG4gICAgICAgIHNwZWVkOiA0MDAsXG4gICAgICAgIGNzc0Vhc2U6ICdjdWJpYy1iZXppZXIoMC43NywgMCwgMC4xOCwgMSknXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgJHNsaWRlck5hdiA9ICRnb29kLmZpbmQoJ1tqcy1zeW5jLXNsaWRlci1uYXZdJyk7XG5cbiAgICAgICRzbGlkZXJOYXYub24oJ2luaXQnLCBmdW5jdGlvbiAoZXZlbnQsIHNsaWNrKSB7XG4gICAgICAgICQoJy5zeW5jLXNsaWRlcl9uYXYgLnNsaWNrLXNsaWRlLnNsaWNrLWN1cnJlbnQnKS5hZGRDbGFzcygnaXMtYWN0aXZlJyk7XG4gICAgICB9KS5zbGljayh7XG4gICAgICAgIHByZXZBcnJvdzogbnVsbCxcbiAgICAgICAgbmV4dEFycm93OiBudWxsLFxuICAgICAgICBzbGlkZXNUb1Nob3c6IDQsXG4gICAgICAgIHNsaWRlc1RvU2Nyb2xsOiAxLFxuICAgICAgICBkb3RzOiBmYWxzZSxcbiAgICAgICAgZm9jdXNPblNlbGVjdDogZmFsc2UsXG4gICAgICAgIGluZmluaXRlOiBmYWxzZSxcbiAgICAgICAgdmFyaWFibGVXaWR0aDogdHJ1ZSxcbiAgICAgICAgc3dpcGU6IHRydWUsXG4gICAgICAgIHJlc3BvbnNpdmU6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBicmVha3BvaW50OiA1NzYsXG4gICAgICAgICAgICBzZXR0aW5nczoge1xuICAgICAgICAgICAgICBzbGlkZXNUb1Nob3c6IDNcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH0pO1xuXG4gICAgICAkc2xpZGVyU2luZ2xlLm9uKCdhZnRlckNoYW5nZScsIGZ1bmN0aW9uIChldmVudCwgc2xpY2ssIGN1cnJlbnRTbGlkZSkge1xuICAgICAgICAkc2xpZGVyTmF2LnNsaWNrKCdzbGlja0dvVG8nLCBjdXJyZW50U2xpZGUpO1xuICAgICAgICAgIFxuICAgICAgICB2YXIgY3VycnJlbnROYXZTbGlkZUVsZW0gPSAnLnN5bmMtc2xpZGVyX25hdiAuc2xpY2stc2xpZGVbZGF0YS1zbGljay1pbmRleD1cIicgKyBjdXJyZW50U2xpZGUgKyAnXCJdJztcbiAgICBcbiAgICAgICAgJCgnLnN5bmMtc2xpZGVyX25hdiAuc2xpY2stc2xpZGUuaXMtYWN0aXZlJykucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuICAgIFxuICAgICAgICAkKGN1cnJyZW50TmF2U2xpZGVFbGVtKS5hZGRDbGFzcygnaXMtYWN0aXZlJyk7XG4gICAgICB9KTtcblxuICAgICAgJHNsaWRlck5hdi5vbignY2xpY2snLCAnLnNsaWNrLXNsaWRlJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgdmFyIGdvVG9TaW5nbGVTbGlkZSA9ICQodGhpcykuZGF0YSgnc2xpY2staW5kZXgnKTtcblxuICAgICAgICAkc2xpZGVyU2luZ2xlLnNsaWNrKCdzbGlja0dvVG8nLCBnb1RvU2luZ2xlU2xpZGUpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn0pKCk7IiwiOyhmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICBjb25zdCAkc2xpZGVycyA9ICQoJ1tqcy1zd2lwZXItc2xpZGVyXScpO1xuXG4gIGlmICgkc2xpZGVycy5sZW5ndGgpIHtcbiAgICAkc2xpZGVycy5lYWNoKGZ1bmN0aW9uKGlkeCkge1xuICAgICAgY29uc3QgJHNsaWRlciA9ICQodGhpcyk7XG4gICAgICAkc2xpZGVyLmFkZENsYXNzKGBzd2lwZXItJHtpZHh9YCk7XG4gICAgICBcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgIHNsaWRlc1BlclZpZXc6IDQsXG4gICAgICAgIHNwYWNlQmV0d2VlbjogMzAsXG4gICAgICAgIGF1dG9SZXNpemU6IGZhbHNlLFxuICAgICAgICBuYXZpZ2F0aW9uOiB7XG4gICAgICAgICAgbmV4dEVsOiAnLnByb2R1Y3RzX19idXR0b25fbmV4dCcsXG4gICAgICAgICAgcHJldkVsOiAnLnByb2R1Y3RzX19idXR0b25fcHJldidcbiAgICAgICAgfSxcbiAgICAgICAgc2Nyb2xsYmFyOiB7XG4gICAgICAgICAgZWw6ICcucHJvZHVjdHNfX3Njcm9sbGJhcicsXG4gICAgICAgICAgZHJhZ2dhYmxlOiB0cnVlXG4gICAgICAgIH0sXG4gICAgICAgIGJyZWFrcG9pbnRzOiB7XG4gICAgICAgICAgMTEwMDoge1xuICAgICAgICAgICAgc2xpZGVzUGVyVmlldzogM1xuICAgICAgICAgIH0sXG4gICAgICAgICAgODQ1OiB7XG4gICAgICAgICAgICBzbGlkZXNQZXJWaWV3OiAyXG4gICAgICAgICAgfSxcbiAgICAgICAgICA3MjE6IHtcbiAgICAgICAgICAgIHNwYWNlQmV0d2VlbjogMTVcbiAgICAgICAgICB9LFxuICAgICAgICAgIDU1MDoge1xuICAgICAgICAgICAgc2xpZGVzUGVyVmlldzogMSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIFxuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgXG4gICAgICBjb25zdCBzbGlkZXIgPSBuZXcgU3dpcGVyKGAuc3dpcGVyLSR7aWR4fWAsIG9wdGlvbnMpO1xuXG4gICAgfSk7XG5cbiAgfVxufSgpKTsiLCI7KGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgY29uc3QgJHRhYnMgPSAkKCdbanMtdGFic10nKTtcblxuICBpZiAoJHRhYnMubGVuZ3RoKSB7XG4gICAgJHRhYnMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIGNvbnN0ICR0YWIgPSAkKHRoaXMpO1xuICAgICAgJHRhYi5yZXNwb25zaXZlVGFicyh7XG4gICAgICAgIHN0YXJ0Q29sbGFwc2VkOiAnYWNjb3JkaW9uJ1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn0pKCk7IiwiOyhmdW5jdGlvbigpIHtcbiAgY29uc3QgJGJ1dHRvbnMgPSAkKCcuanMtdGlwJyk7XG5cbiAgaWYgKCRidXR0b25zLmxlbmd0aCkge1xuICAgJGJ1dHRvbnMuZWFjaChmdW5jdGlvbigpIHtcbiAgICBjb25zdCAkYnV0dG9uID0gJCh0aGlzKTtcbiAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgekluZGV4OiAzLFxuICAgICAgY29udGVudEFzSFRNTDogdHJ1ZSxcbiAgICAgIGNvbnRlbnQ6ICfQn9GA0L7RgdGC0L4g0L/RgNC10LTRgdGC0LDQstGM0YLQtdGB0Ywg0Lgg0L7RgdGC0LDQstGM0YLQtSDQvdC+0LzQtdGAINGB0LLQvtC10LPQviDRgtC10LvQtdGE0L7QvdCwLiDQnNC10L3QtdC00LbQtdGAINC/0LXRgNC10LfQstC+0L3QuNGCINCy0LDQvCDQuCDRg9GC0L7Rh9C90LjRgiDQstGB0Y4g0L3QtdC00L7RgdGC0LDRjtGJ0YPRjiDQuNC90YTQvtGA0LzQsNGG0LjRji4nLFxuICAgIH07XG4gICAgLy8g0J/RgNC+0YHRgtC+INC/0YDQtdC00YHRgtCw0LLRjNGC0LXRgdGMINC4INC+0YHRgtCw0LLRjNGC0LUg0L3QvtC80LXRgCDRgdCy0L7QtdCz0L4g0YLQtdC70LXRhNC+0L3QsC4g0JzQtdC90LXQtNC20LXRgCDQv9C10YDQtdC30LLQvtC90LjRgiDQstCw0Lwg0Lgg0YPRgtC+0YfQvdC40YIg0LLRgdGOINC90LXQtNC+0YHRgtCw0Y7RidGD0Y4g0LjQvdGE0L7RgNC80LDRhtC40Y4uXG4gICAgJGJ1dHRvbi50b29sdGlwc3RlcihvcHRpb25zKTtcbiAgIH0pO1xuICB9XG59KSgpOyIsIjsoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICBjb25zdCAkZm9ybXMgPSAkKCdbanMtZm9ybV0nKTtcblxuICBpZiAoJGZvcm1zLmxlbmd0aCkge1xuXG4gICAgY29uc3QgbWFza3MgPSB7XG4gICAgICB0ZWw6ICcrNyAoOTk5KSAtIDk5OSAtIDk5IDk5JyxcbiAgICAgIHRleHQ6ICdbYS16QS1a0JAt0K/QsC3RjyBdKidcbiAgICB9O1xuXG4gICAgZnVuY3Rpb24gaW5pdElucHV0TWFzaygkaW5wdXQsIGF0dHJOYW1lKSB7XG4gICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICByZW1vdmVNYXNrT25TdWJtaXQ6IHRydWUsXG4gICAgICAgIGNsZWFySW5jb21wbGV0ZTogdHJ1ZVxuICAgICAgfTtcbiAgICAgIHN3aXRjaCAoYXR0ck5hbWUpIHtcbiAgICAgICAgY2FzZSAndGVsJzpcbiAgICAgICAgICAkaW5wdXQuaW5wdXRtYXNrKHtcbiAgICAgICAgICAgIG1hc2s6IG1hc2tzW2F0dHJOYW1lXSxcbiAgICAgICAgICAgIC4uLm9wdGlvbnMsIFxuICAgICAgICAgICAgb25jb21wbGV0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICQodGhpcykuYmx1cigpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnbmFtZSc6XG4gICAgICAgICAgJGlucHV0LmlucHV0bWFzayh7cmVnZXg6IG1hc2tzLnRleHQsIC4uLm9wdGlvbnN9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICAkZm9ybXMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIGNvbnN0ICRmb3JtID0gJCh0aGlzKTtcbiAgICAgIGNvbnN0ICRpbnB1dHMgPSAkZm9ybS5maW5kKCdpbnB1dCwgdGV4dGFyZWEnKTtcbiAgICAgIGNvbnN0ICRzdWJtaXQgPSAkZm9ybS5maW5kKCdidXR0b25bdHlwZT1cInN1Ym1pdFwiXScpO1xuXG4gICAgICAkaW5wdXRzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0ICRpbnB1dCA9ICQodGhpcyk7XG4gICAgICAgIGNvbnN0IGF0dHJOYW1lID0gJGlucHV0LmF0dHIoJ25hbWUnKTtcbiAgICAgICAgaW5pdElucHV0TWFzaygkaW5wdXQsIGF0dHJOYW1lKTtcblxuICAgICAgICBzd2l0Y2ggKGF0dHJOYW1lKSB7XG4gICAgICAgICAgY2FzZSAnbWVzc2FnZSc6XG4gICAgICAgICAgICAkaW5wdXQub2ZmKCdpbnZhbGlkJykub24oJ2ludmFsaWQnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgY29uc3QgeyB2YWxpZGl0eSB9ID0gZXZlbnQudGFyZ2V0O1xuICAgICAgICAgICAgICBpZiAodmFsaWRpdHkudG9vU2hvcnQpIHtcbiAgICAgICAgICAgICAgICBldmVudC50YXJnZXQuc2V0Q3VzdG9tVmFsaWRpdHkoJ9Ci0LXQutGB0YIg0YHQvtC+0LHRidC10L3QuNGPINC00L7Qu9C20LXQvSDRgdC+0YHRgtC+0Y/RgtGMINC80LjQvdC40LzRg9C8INC40LcgNSDRgdC40LzQstC+0LvQvtCyJyk7XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsaWRpdHkudmFsdWVNaXNzaW5nKSB7XG4gICAgICAgICAgICAgICAgZXZlbnQudGFyZ2V0LnNldEN1c3RvbVZhbGlkaXR5KCfQndCw0L/QuNGI0LjRgtC1LCDQs9C00LUg0L7RiNC40LHQutCwINC40LvQuCDQstCw0YjQuCDQv9C+0LbQtdC70LDQvdC40Y8nKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBldmVudC50YXJnZXQuc2V0Q3VzdG9tVmFsaWRpdHkoJycpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIFxuICAgICAgICAgIGNhc2UgJ25hbWUnOlxuICAgICAgICAgICAgJGlucHV0Lm9mZignaW52YWxpZCcpLm9uKCdpbnZhbGlkJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgdmFsaWRpdHkgfSA9IGV2ZW50LnRhcmdldDtcblxuICAgICAgICAgICAgICBpZiAodmFsaWRpdHkudG9vU2hvcnQpIHtcbiAgICAgICAgICAgICAgICBldmVudC50YXJnZXQuc2V0Q3VzdG9tVmFsaWRpdHkoJ9CY0LzRjyDQtNC+0LvQttC90L4g0YHQvtGB0YLQvtGP0YLRjCDQvNC40L3QuNC80YPQvCDQuNC3IDIg0YHQuNC80LLQvtC70L7QsicpO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKHZhbGlkaXR5LnZhbHVlTWlzc2luZykge1xuICAgICAgICAgICAgICAgIGV2ZW50LnRhcmdldC5zZXRDdXN0b21WYWxpZGl0eSgn0JLQstC10LTQuNGC0LUg0LLQsNGI0LUg0LjQvNGPJyk7XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsaWRpdHkucGF0dGVybk1pc21hdGNoKSB7XG4gICAgICAgICAgICAgICAgZXZlbnQudGFyZ2V0LnNldEN1c3RvbVZhbGlkaXR5KCfQkiDQv9C+0LvQtSDQvdC1INC00L7Qu9C20L3QviDQsdGL0YLRjCDRh9C40YHQtdC7INC4INC30L3QsNC60L7QsicpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGV2ZW50LnRhcmdldC5zZXRDdXN0b21WYWxpZGl0eSgnJyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICBjYXNlICdlbWFpbCc6IFxuICAgICAgICAgICAgJGlucHV0Lm9mZignaW52YWxpZCcpLm9uKCdpbnZhbGlkJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgdmFsaWRpdHkgfSA9IGV2ZW50LnRhcmdldDtcbiAgICAgICAgICAgICAgaWYgKHZhbGlkaXR5LnZhbHVlTWlzc2luZykge1xuICAgICAgICAgICAgICAgIGV2ZW50LnRhcmdldC5zZXRDdXN0b21WYWxpZGl0eSgn0JLQstC10LTQuNGC0LUg0LLQsNGI0YMg0Y3Qu9C10LrRgtGA0L7QvdC90YPRjiDQv9C+0YfRgtGDJyk7XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsaWRpdHkudHlwZU1pc21hdGNoKSB7XG4gICAgICAgICAgICAgICAgZXZlbnQudGFyZ2V0LnNldEN1c3RvbVZhbGlkaXR5KCfQkNC00YDQtdGBINGN0LvQtdC60YLRgNC+0L3QvdC+0Lkg0L/QvtGH0YLRiyDQtNC+0LvQttC10L0g0YHQvtC+0YLQstC10YLRgdGC0LLQvtCy0LDRgtGMINGE0L7RgNC80LDRgtGDOiDCq2FiY0BhYmMuY29twrsnKTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmICh2YWxpZGl0eS5wYXR0ZXJuTWlzbWF0Y2gpIHtcbiAgICAgICAgICAgICAgICBldmVudC50YXJnZXQuc2V0Q3VzdG9tVmFsaWRpdHkoJ9CQ0LTRgNC10YEg0Y3Qu9C10LrRgtGA0L7QvdC90L7QuSDQv9C+0YfRgtGLINC00L7Qu9C20LXQvSDRgdC+0L7RgtCy0LXRgtGB0YLQstC+0LLQsNGC0Ywg0YTQvtGA0LzQsNGC0YM6IMKrYWJjQGFiYy5jb23CuycpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGV2ZW50LnRhcmdldC5zZXRDdXN0b21WYWxpZGl0eSgnJyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgY2FzZSAndGVsJzpcbiAgICAgICAgICAgICRpbnB1dC5vZmYoJ2ludmFsaWQnKS5vbignaW52YWxpZCcsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICBjb25zdCB7dGFyZ2V0fSA9IGV2ZW50O1xuICAgICAgICAgICAgICBjb25zdCB7IHZhbGlkaXR5IH0gPSB0YXJnZXQ7XG5cbiAgICAgICAgICAgICAgaWYgKHZhbGlkaXR5LnZhbHVlTWlzc2luZykge1xuICAgICAgICAgICAgICAgIGV2ZW50LnRhcmdldC5zZXRDdXN0b21WYWxpZGl0eSgn0J3QvtC80LXRgCDRgtC10LvQtdGE0L7QvdCwINC00L7Qu9C20LXQvSDRgdC+0YHRgtC+0Y/RgtGMINC40LcgMTEg0YbQuNGE0YAnKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBldmVudC50YXJnZXQuc2V0Q3VzdG9tVmFsaWRpdHkoJycpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxufSkoKTsiLCI7KGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgY29uc3QgJGl0ZW1zID0gJCgnW2pzLXpvb21dJyk7XG5cbiAgaWYgKCRpdGVtcy5sZW5ndGggJiYgJCgnYm9keScpLndpZHRoKCkgPj0gMTAwMCkge1xuICAgICRpdGVtcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgY29uc3QgJGl0ZW0gPSAkKHRoaXMpO1xuICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgICAgdXJsOiBmYWxzZSxcbiAgICAgICAgbWFnbmlmeTogMS41LFxuICAgICAgICB0b3VjaDogZmFsc2VcbiAgICAgIH07XG5cbiAgICAgICRpdGVtLnpvb20ob3B0aW9ucyk7XG4gICAgfSk7XG4gICAgY29uc29sZS5sb2coJCgnYm9keScpLndpZHRoKCkpXG4gIH1cblxufSkoKTsiXX0=
