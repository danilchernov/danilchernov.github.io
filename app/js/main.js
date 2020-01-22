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
  var $buttons = $('.js-create-fast-order');

  if ($buttons.length) {
    var popup = {
      img: $('.order__image img'),
      name: $('.order__name'),
      input: {
        link: $('.order input[name="link"]'),
        title: $('.order input[name="title"]')
      }
    };
    $buttons.each(function () {
      var $button = $(this);
      var buttonData = {
        title: $button.data('title'),
        src: $button.data('img'),
        href: $button.data('link')
      };

      var clickHandler = function clickHandler() {
        var title = buttonData.title,
            src = buttonData.src,
            href = buttonData.href;
        popup.img.attr('src', src);
        popup.name.text(title);
        popup.input.link.val(href);
        popup.input.title.val(title);
      };

      $button.on('click', clickHandler);
    });
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

window.selectInit = function () {
  var $selects = $('.js-fake-select');

  if ($selects.length) {
    $selects.each(function () {
      var $select = $(this);
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

      var replaceSelectedItem = function replaceSelectedItem($item, $placeForRender) {
        $placeForRender.empty();
        $placeForRender.append($item.clone(true));
      };

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
          }
        });
      });
    });
  }
};

window.selectInit();
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

;

(function () {
  'use strict';

  var $forms = $('[js-form]');

  if ($forms.length) {
    var masks = {
      tel: '+7 (999) - 999 - 9999',
      text: '[a-zA-ZА-Яа-я ]*'
    };
    $forms.each(function () {
      var $form = $(this);
      var $button = $form.find('button[type="submit"]');
      var popupId = $form.data('src');
      var $inputs = $form.find('input');
      $inputs.each(function () {
        var $input = $(this);
        var type = $input.attr('type');

        switch (type) {
          case 'tel':
            $input.inputmask({
              mask: masks.tel,
              autoUnmask: true
            });
            break;

          case 'text':
            $input.inputmask({
              regex: masks.text
            });
            break;

          default:
            $input.inputmask();
        }
      });

      var clickHandler = function clickHandler(event) {
        event.preventDefault();
        var validation = [];
        $inputs.each(function () {
          var $input = $(this);

          if ($input.inputmask('isComplete')) {
            validation.push($input.inputmask('isComplete'));
          }
        });

        if (validation.length === $inputs.length && $form[0].checkValidity()) {
          $form.trigger('submit');
        } else {
          $form[0].reportValidity();
        }
      };

      $button.off('click.validation').on('click.validation', clickHandler);
    });
  }
})();

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
  var rating = document.querySelector('.js-change-rating');

  if (rating) {
    var removeClass = function removeClass(arr) {
      for (var i = 0, iLen = arr.length; i < iLen; i++) {
        for (var j = 1; j < arguments.length; j++) {
          ratingItem[i].classList.remove(arguments[j]);
        }
      }
    };

    var addClass = function addClass(arr) {
      for (var i = 0, iLen = arr.length; i < iLen; i++) {
        for (var j = 1; j < arguments.length; j++) {
          ratingItem[i].classList.add(arguments[j]);
        }
      }
    };

    var mouseOverActiveClass = function mouseOverActiveClass(arr) {
      for (var i = 0, iLen = arr.length; i < iLen; i++) {
        if (arr[i].classList.contains('active')) {
          break;
        } else {
          arr[i].classList.add('active');
        }
      }
    };

    var mouseOutActiveClas = function mouseOutActiveClas(arr) {
      for (var i = arr.length - 1; i >= 1; i--) {
        if (arr[i].classList.contains('current-active')) {
          break;
        } else {
          arr[i].classList.remove('active');
        }
      }
    };

    var ratingInput = rating.querySelector('input');
    var ratingItem = rating.querySelectorAll('.rating__item');

    rating.onclick = function (e) {
      var target = e.target;

      if (target.classList.contains('rating__item')) {
        removeClass(ratingItem, 'current-active');
        target.classList.add('active', 'current-active');
        ratingInput.value = target.dataset.rate;
      }
    };

    rating.onmouseover = function (e) {
      var target = e.target;

      if (target.classList.contains('rating__item')) {
        removeClass(ratingItem, 'active');
        target.classList.add('active');
        mouseOverActiveClass(ratingItem);
      }
    };

    rating.onmouseout = function () {
      addClass(ratingItem, 'active');
      mouseOutActiveClas(ratingItem);
    };
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNhcnQtc2xpZGUuanMiLCJjYXRlZ29yaWVzLXNsaWRlLmpzIiwiY2hlY2tvdXQuanMiLCJjb250YWN0cy1tYXAuanMiLCJjcmVhdGUtZmFzdC1vcmRlci1jYXJkLmpzIiwiY3VzdG9tLWhvcml6b250YWwtc2Nyb2xsLmpzIiwiY3VzdG9tLXZlcnRpY2FsLXNjcm9sbC5qcyIsImRldGFpbGVkLXNlbGVjdC5qcyIsImZpbHRlci1idXR0b24uanMiLCJmaWx0ZXItc2xpZGUuanMiLCJmb3JtLmpzIiwiaGVhZGVyLXNjcm9sbC5qcyIsIm1lcml0LmpzIiwib2JqZWN0LWZpdC5qcyIsInBhcmFsbGF4LmpzIiwicG9wdXAtb3Blbi5qcyIsInByb2R1Y3QtY2hhbmdlLWxheW91dC5qcyIsInJldmlld3MuanMiLCJzY3JvbGwtdXAuanMiLCJzZWxlY3RzLmpzIiwic2V0LmpzIiwic2l0ZS1uYXZpZ2F0aW9uLmpzIiwic2xpY2stc2ltcGxlLXNsaWRlci5qcyIsInNsaWNrLXN5bmMtc2xpZGVycy5qcyIsInN0YXItcmF0aW5nLmpzIiwic3dpcGVyLXNsaWRlci5qcyIsInRhYnMuanMiLCJ0b29sdGlwcy5qcyIsInZhbGlkYXRpb24uanMiLCJ6b29tLmpzIl0sIm5hbWVzIjpbIiRjYXJ0cyIsIiQiLCJsZW5ndGgiLCJlYWNoIiwiJGNhcnQiLCJjbGlja0hhbmRsZXIiLCJldmVudCIsInN0b3BQcm9wYWdhdGlvbiIsIiRsaXN0IiwiZmluZCIsInRvZ2dsZUNsYXNzIiwic2xpZGVUb2dnbGUiLCJkb2N1bWVudCIsIm9uIiwiaXMiLCJ0YXJnZXQiLCJoYXMiLCJyZW1vdmVDbGFzcyIsInNsaWRlVXAiLCIkdG9nZ2xlcyIsIiR0b2dnbGUiLCIkcGFyZW50IiwicGFyZW50Iiwib2ZmIiwiJGNoZWNrb3V0IiwiJHN0YXJ0QnRuIiwiJGZpcnN0Q2hlY2tvdXRJbnB1dCIsImRvY3VtZW50RWxlbWVudCIsImJvZHkiLCJhbmltYXRlIiwic2Nyb2xsVG9wIiwib2Zmc2V0IiwidG9wIiwiaGVpZ2h0IiwiZm9jdXMiLCIkbWFwIiwiaW5pdE1hcCIsInltYXBzIiwicmVhZHkiLCJpbml0IiwibWFwIiwiTWFwIiwiY2VudGVyIiwiem9vbSIsInBsYWNlbWFyayIsIlBsYWNlbWFyayIsIm9wZW5CYWxsb29uT25DbGljayIsImN1cnNvciIsImljb25MYXlvdXQiLCJpY29uSW1hZ2VIcmVmIiwiaWNvbkltYWdlU2l6ZSIsImJlaGF2aW9ycyIsImRpc2FibGUiLCJnZW9PYmplY3RzIiwiYWRkIiwiJGJ1dHRvbnMiLCJwb3B1cCIsImltZyIsIm5hbWUiLCJpbnB1dCIsImxpbmsiLCJ0aXRsZSIsIiRidXR0b24iLCJidXR0b25EYXRhIiwiZGF0YSIsInNyYyIsImhyZWYiLCJhdHRyIiwidGV4dCIsInZhbCIsImNvbnRhaW5lcnMiLCJxdWVyeVNlbGVjdG9yQWxsIiwiZm9yRWFjaCIsImVsZW1lbnQiLCJvcHRpb25zIiwid2hlZWxQcm9wYWdhdGlvbiIsImNvbnRhaW5lciIsIlBlcmZlY3RTY3JvbGxiYXIiLCJ3aW5kb3ciLCJzZWxlY3RJbml0IiwiJHNlbGVjdHMiLCIkc2VsZWN0IiwibGlzdExlbmd0aCIsImNoaWxkcmVuIiwiJGl0ZW1zIiwiYWRkQ2xhc3MiLCJyZXBsYWNlU2VsZWN0ZWRJdGVtIiwiJGl0ZW0iLCIkcGxhY2VGb3JSZW5kZXIiLCJlbXB0eSIsImFwcGVuZCIsImNsb25lIiwiJHJhZGlvIiwicmFkaW9WYWwiLCJwcm9wIiwiJGZpbHRlciIsInRvZ2dsZUhhbmRsZXIiLCJwcmV2ZW50RGVmYXVsdCIsIiRpbnB1dHMiLCJjYWxjdWxhdGVQb3NpdGlvblRvcCIsIiRpbnB1dCIsImlucHV0UGFnZVkiLCJsaXN0UGFnZVkiLCJidXR0b25IZWlnaHQiLCJvdXRlckhlaWdodCIsInNob3dCdXR0b24iLCJjaGVja2VkRWxlbXMiLCJpbnB1dENsaWNrSGFuZGxlciIsIiR0YXJnZXQiLCJjc3MiLCJjb25zb2xlIiwibG9nIiwiJGxpc3RzIiwiZXZuZXQiLCIkZm9ybXMiLCJtYXNrcyIsInRlbCIsIiRmb3JtIiwicG9wdXBJZCIsInR5cGUiLCJpbnB1dG1hc2siLCJtYXNrIiwiYXV0b1VubWFzayIsInJlZ2V4IiwidmFsaWRhdGlvbiIsInB1c2giLCJjaGVja1ZhbGlkaXR5IiwidHJpZ2dlciIsInJlcG9ydFZhbGlkaXR5IiwiJGJvZHkiLCIkaGVhZGVyIiwiJHZpc2libGVSb3ciLCJoZWFkZXJIZWlnaHQiLCJzY3JvbGxIYW5sZGVyIiwic2Nyb2xsIiwiJGNvbnRhaW5lciIsIiRwcmV2aW91c0J1dHRvbiIsIiRkaXNwbGF5IiwiJHRpdGxlIiwiJHBhcmFncmFwaCIsImNoZWNrUHJldmlvdXNCdXR0b24iLCJwYXJhZ3JhcGgiLCJodG1sIiwicmVzaXplIiwiJHZpZXdwb3J0IiwiaW5uZXJXaWR0aCIsIm9iamVjdEZpdEltYWdlcyIsIiRzY2VuZXMiLCIkc2NlbmUiLCJwYXJhbGxheGlmeSIsInBvc2l0aW9uUHJvcGVydHkiLCIkc2Nyb2xsQmFyV2lkdGgiLCJ3aWR0aCIsImhpZGVTY3JvbGxiYXIiLCJ0b3VjaCIsImJ0blRwbCIsInNtYWxsQnRuIiwiYmVmb3JlU2hvdyIsInNsaWNlIiwiYm9keVN0eWxlcyIsImhhc0NsYXNzIiwiYWZ0ZXJDbG9zZSIsImZhbmN5Ym94IiwiJGZpZWxkcyIsIiRmaWVsZENvbnRhaW5lciIsIiRmaWVsZCIsIiRsYWJlbCIsInZpZXciLCIkcHJvZHVjdHMiLCJvbkNoYW5nZUhhbmRsZXIiLCJyZXNpemVIYW5kbGVyIiwiJG1heFZpZXdXaWR0aCIsImN1cnJlbnRWaWV3V2lkdGgiLCIkcmV2aWV3cyIsIiRyZXZpZXciLCJjaGVja092ZXJmbG93IiwiY2hlY2siLCJzY3JvbGxIZWlnaHQiLCJpbm5lckhlaWdodCIsIiRzY3JvbGxzIiwiJHNjcm9sbCIsImhpZGVBbmNob3IiLCIkd2luZG93Iiwib25lVGhpcmREb2N1bWVudEhlaWdodCIsIm1pbmltdW1SZXN1bHRzRm9yU2VhcmNoIiwic2VsZWN0MiIsIiRzZXRzIiwiJHNldCIsIiRuYXYiLCIkc2xpZGVycyIsIiRzbGlkZXIiLCJzbGlkZXNUb1Nob3ciLCJ1c2VUcmFuc2Zvcm0iLCJzcGVlZCIsImNzc0Vhc2UiLCJhcnJvd3MiLCJkb3RzIiwiZG90c0NsYXNzIiwiY3VzdG9tUGFnaW5nIiwic2xpZGVyIiwiaSIsInNsaWNrIiwiJGdvb2RzIiwiJGdvb2QiLCIkc2xpZGVyU2luZ2xlIiwic2xpZGVzVG9TY3JvbGwiLCJmYWRlIiwiaW5maW5pdGUiLCIkc2xpZGVyTmF2IiwicHJldkFycm93IiwibmV4dEFycm93IiwiZm9jdXNPblNlbGVjdCIsInZhcmlhYmxlV2lkdGgiLCJzd2lwZSIsInJlc3BvbnNpdmUiLCJicmVha3BvaW50Iiwic2V0dGluZ3MiLCJjdXJyZW50U2xpZGUiLCJjdXJycmVudE5hdlNsaWRlRWxlbSIsImdvVG9TaW5nbGVTbGlkZSIsInJhdGluZyIsInF1ZXJ5U2VsZWN0b3IiLCJhcnIiLCJpTGVuIiwiaiIsImFyZ3VtZW50cyIsInJhdGluZ0l0ZW0iLCJjbGFzc0xpc3QiLCJyZW1vdmUiLCJtb3VzZU92ZXJBY3RpdmVDbGFzcyIsImNvbnRhaW5zIiwibW91c2VPdXRBY3RpdmVDbGFzIiwicmF0aW5nSW5wdXQiLCJvbmNsaWNrIiwiZSIsInZhbHVlIiwiZGF0YXNldCIsInJhdGUiLCJvbm1vdXNlb3ZlciIsIm9ubW91c2VvdXQiLCJpZHgiLCJzbGlkZXNQZXJWaWV3Iiwic3BhY2VCZXR3ZWVuIiwiYXV0b1Jlc2l6ZSIsIm5hdmlnYXRpb24iLCJuZXh0RWwiLCJwcmV2RWwiLCJzY3JvbGxiYXIiLCJlbCIsImRyYWdnYWJsZSIsImJyZWFrcG9pbnRzIiwiU3dpcGVyIiwiJHRhYnMiLCIkdGFiIiwicmVzcG9uc2l2ZVRhYnMiLCJzdGFydENvbGxhcHNlZCIsInpJbmRleCIsImNvbnRlbnRBc0hUTUwiLCJjb250ZW50IiwidG9vbHRpcHN0ZXIiLCJpbml0SW5wdXRNYXNrIiwiYXR0ck5hbWUiLCJyZW1vdmVNYXNrT25TdWJtaXQiLCJjbGVhckluY29tcGxldGUiLCJvbmNvbXBsZXRlIiwiYmx1ciIsIiRzdWJtaXQiLCJ2YWxpZGl0eSIsInRvb1Nob3J0Iiwic2V0Q3VzdG9tVmFsaWRpdHkiLCJ2YWx1ZU1pc3NpbmciLCJwYXR0ZXJuTWlzbWF0Y2giLCJ0eXBlTWlzbWF0Y2giLCJ1cmwiLCJtYWduaWZ5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQTs7QUFBQSxhQUFBO0FBQ0E7O0FBQ0EsTUFBQUEsTUFBQSxHQUFBQyxDQUFBLENBQUEsV0FBQSxDQUFBOztBQUVBLE1BQUFELE1BQUEsQ0FBQUUsTUFBQSxFQUFBO0FBQ0FGLElBQUFBLE1BQUEsQ0FBQUcsSUFBQSxDQUFBLFlBQUE7QUFDQSxVQUFBQyxLQUFBLEdBQUFILENBQUEsQ0FBQSxJQUFBLENBQUE7O0FBRUEsVUFBQUksWUFBQSxHQUFBLFNBQUFBLFlBQUEsQ0FBQUMsS0FBQSxFQUFBO0FBQ0FBLFFBQUFBLEtBQUEsQ0FBQUMsZUFBQSxHQURBLENBQ0E7O0FBQ0EsWUFBQUMsS0FBQSxHQUFBSixLQUFBLENBQUFLLElBQUEsQ0FBQSxnQkFBQSxDQUFBO0FBQ0FMLFFBQUFBLEtBQUEsQ0FBQU0sV0FBQSxDQUFBLFNBQUE7QUFDQUYsUUFBQUEsS0FBQSxDQUFBRyxXQUFBO0FBRUEsT0FOQTs7QUFRQVYsTUFBQUEsQ0FBQSxDQUFBVyxRQUFBLENBQUEsQ0FBQUMsRUFBQSxDQUFBLGtCQUFBLEVBQUEsZ0JBQUEsRUFBQVIsWUFBQTtBQUNBSixNQUFBQSxDQUFBLENBQUFXLFFBQUEsQ0FBQSxDQUFBQyxFQUFBLENBQUEsbUJBQUEsRUFBQSxpQkFBQSxFQUFBUixZQUFBO0FBRUE7O0FBRUFKLE1BQUFBLENBQUEsQ0FBQVcsUUFBQSxDQUFBLENBQUFDLEVBQUEsQ0FBQSxxQkFBQSxFQUFBLFVBQUFQLEtBQUEsRUFBQTtBQUNBQSxRQUFBQSxLQUFBLENBQUFDLGVBQUE7O0FBQ0EsWUFBQSxDQUFBSCxLQUFBLENBQUFVLEVBQUEsQ0FBQVIsS0FBQSxDQUFBUyxNQUFBLENBQUEsSUFBQVgsS0FBQSxDQUFBWSxHQUFBLENBQUFWLEtBQUEsQ0FBQVMsTUFBQSxFQUFB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QUFBO0FBQ0F1TSxRQUFBQSxHQUFBLEVBQUEsS0FEQTtBQUVBQyxRQUFBQSxPQUFBLEVBQUEsR0FGQTtBQUdBeEgsUUFBQUEsS0FBQSxFQUFBO0FBSEEsT0FBQTtBQU1BbkUsTUFBQUEsS0FBQSxDQUFBNUMsSUFBQSxDQUFBK0IsT0FBQTtBQUNBLEtBVEE7QUFVQW9DLElBQUFBLE9BQUEsQ0FBQUMsR0FBQSxDQUFBOUcsQ0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBdUosS0FBQSxFQUFBO0FBQ0E7QUFFQSxDQW5CQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiOyhmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICBjb25zdCAkY2FydHMgPSAkKCdbanMtY2FydF0nKTtcblxuICBpZiAoJGNhcnRzLmxlbmd0aCkge1xuICAgICRjYXJ0cy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgY29uc3QgJGNhcnQgPSAkKHRoaXMpO1xuXG4gICAgICBjb25zdCBjbGlja0hhbmRsZXIgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7IC8vIFJlbW92ZSBldmVudCBob2lzdGluZyBcbiAgICAgICAgY29uc3QgJGxpc3QgPSAkY2FydC5maW5kKCdbanMtY2FydC1saXN0XScpO1xuICAgICAgICAkY2FydC50b2dnbGVDbGFzcygnaXMtb3BlbicpO1xuICAgICAgICAkbGlzdC5zbGlkZVRvZ2dsZSgpO1xuICAgICAgICBcbiAgICAgIH07XG4gICAgICBcbiAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljay5vcGVuLnBvcHVwJywgJ1tqcy1jYXJ0LW9wZW5dJywgY2xpY2tIYW5kbGVyKTtcbiAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljay5jbG9zZS5wb3B1cCcsICdbanMtY2FydC1jbG9zZV0nLCBjbGlja0hhbmRsZXIpO1xuICAgICAgXG4gICAgICAvKiBBbiBldmVudCBoYW5kbGVyIHRvIGNvbnRyb2wgYSBjbGljayBvdXRzaWRlIHRoZSBjYXJ0IGFyZWEuICovXG5cbiAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljay5vdXRzaWRlLnBvcHVwJywoZXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGlmICghJGNhcnQuaXMoZXZlbnQudGFyZ2V0KSAmJiAkY2FydC5oYXMoZXZlbnQudGFyZ2V0KS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICBjb25zdCAkbGlzdCA9ICRjYXJ0LmZpbmQoJ1tqcy1jYXJ0LWxpc3RdJyk7XG4gICAgICAgICAgXG4gICAgICAgICAgJGNhcnQucmVtb3ZlQ2xhc3MoJ2lzLW9wZW4nKTtcbiAgICAgICAgICAkbGlzdC5zbGlkZVVwKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG59KCkpOyIsIjsoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgY29uc3QgJHRvZ2dsZXMgPSAkKCcuanMtY2F0ZWdvcmllcy10b2dnbGUnKTtcblxuXG4gIGlmICgkdG9nZ2xlcy5sZW5ndGgpIHtcbiAgICBjb25zdCAkbGlzdCA9ICQoJy5qcy1jYXRlZ29yaWVzLW5lc3RlZC1saXN0Jyk7XG5cbiAgICAkdG9nZ2xlcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgY29uc3QgJHRvZ2dsZSA9ICQodGhpcyk7XG4gICAgICBjb25zdCAkcGFyZW50ID0gJHRvZ2dsZS5wYXJlbnQoKTtcblxuICAgICAgZnVuY3Rpb24gY2xpY2tIYW5kbGVyKCkge1xuICAgICAgICAkbGlzdC5zbGlkZVRvZ2dsZSgpO1xuICAgICAgICAkcGFyZW50LnRvZ2dsZUNsYXNzKCdpcy1hY3RpdmUnKTtcbiAgICAgIH1cblxuICAgICAgJHRvZ2dsZS5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgY2xpY2tIYW5kbGVyKTtcbiAgICB9KTtcbiAgfVxufSkoKTsiLCI7KGZ1bmN0aW9uKCkge1xuICBjb25zdCAkY2hlY2tvdXQgPSAkKCcuanMtY2hlY2tvdXQnKTtcblxuICBpZiAoJGNoZWNrb3V0Lmxlbmd0aCkge1xuICAgIGNvbnN0ICRzdGFydEJ0biA9ICQoJy5qcy1jaGVja291dC1zdGFydC1vcmRlcicpO1xuICAgICRzdGFydEJ0bi5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICBjb25zdCAkZmlyc3RDaGVja291dElucHV0ID0gJCgnLmpzLWNoZWNrb3V0LXN0YXJ0LWZvY3VzJyk7XG4gICAgICAkKFtkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQsIGRvY3VtZW50LmJvZHldKS5hbmltYXRlKHtcbiAgICAgICAgc2Nyb2xsVG9wOiAkZmlyc3RDaGVja291dElucHV0Lm9mZnNldCgpLnRvcCAtICgkKCcuaGVhZGVyLW1pZCcpLmhlaWdodCgpICogMi41KSAvL01hZ2ljIGZhY3RvciBpbiBvcmRlciB0byBsb29rIGJlYXV0aWZ1bCB0aGUgZWxlbWVudCB0byB3aGljaCB3ZSBzY3JvbGwgdGhlIHBhZ2VcbiAgICAgIH0sIDEwMDApO1xuICAgICAgJGZpcnN0Q2hlY2tvdXRJbnB1dC5mb2N1cygpO1xuICAgIH0pOyBcbiAgfVxufSkoKTsiLCI7KGZ1bmN0aW9uKCkge1xuICBjb25zdCAkbWFwID0gJCgnLmpzLWNvbnRhY3QtbWFwJyk7XG5cbiAgaWYgKCRtYXAubGVuZ3RoKSB7XG4gICAgY29uc3QgaW5pdE1hcCA9ICgpID0+IHtcbiAgICAgIHltYXBzLnJlYWR5KGluaXQpO1xuICAgICAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICAgICAgJCgnI21hcCcpLnJlbW92ZUNsYXNzKCdpcy1sb2FkaW5nJyk7XG5cbiAgICAgICAgbGV0IG1hcCA9IG5ldyB5bWFwcy5NYXAoXCJtYXBcIiwge1xuICAgICAgICAgICAgY2VudGVyOiBbNTMuMzMzMSw4My43ODY5XSxcbiAgICAgICAgICAgIHpvb206IDE2XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGxldCBwbGFjZW1hcmsgPSBuZXcgeW1hcHMuUGxhY2VtYXJrKFs1My4zMzMxLDgzLjc4NjldLCB7XG4gICAgICAgICAgb3BlbkJhbGxvb25PbkNsaWNrOiBmYWxzZSxcbiAgICAgICAgICBjdXJzb3I6ICdkZWZhdWx0J1xuICAgICAgICB9LCB7XG4gICAgICAgICAgaWNvbkxheW91dDogJ2RlZmF1bHQjaW1hZ2UnLFxuICAgICAgICAgIGljb25JbWFnZUhyZWY6ICcuLi9pbWFnZXMvcGluLnBuZycsXG4gICAgICAgICAgaWNvbkltYWdlU2l6ZTogWzMwLCAzN10sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIG1hcC5iZWhhdmlvcnMuZGlzYWJsZShbJ3Njcm9sbFpvb20nXSk7XG5cbiAgICAgICAgbWFwLmdlb09iamVjdHMuYWRkKHBsYWNlbWFyayk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaW5pdE1hcCgpO1xuICB9XG5cbn0pKCk7IiwiOyhmdW5jdGlvbigpIHtcbiAgbGV0ICRidXR0b25zID0gJCgnLmpzLWNyZWF0ZS1mYXN0LW9yZGVyJyk7XG4gIFxuICBpZiAoJGJ1dHRvbnMubGVuZ3RoKSB7XG4gICAgbGV0IHBvcHVwID0ge1xuICAgICAgaW1nOiAkKCcub3JkZXJfX2ltYWdlIGltZycpLFxuICAgICAgbmFtZTogJCgnLm9yZGVyX19uYW1lJyksXG4gICAgICBpbnB1dDoge1xuICAgICAgICBsaW5rOiAkKCcub3JkZXIgaW5wdXRbbmFtZT1cImxpbmtcIl0nKSxcbiAgICAgICAgdGl0bGU6ICQoJy5vcmRlciBpbnB1dFtuYW1lPVwidGl0bGVcIl0nKVxuICAgICAgfVxuICAgIH07XG5cblxuICAgICRidXR0b25zLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICBsZXQgJGJ1dHRvbiA9ICQodGhpcyk7XG5cbiAgICAgIGxldCBidXR0b25EYXRhID0ge1xuICAgICAgICB0aXRsZTogJGJ1dHRvbi5kYXRhKCd0aXRsZScpLFxuICAgICAgICBzcmM6ICRidXR0b24uZGF0YSgnaW1nJyksXG4gICAgICAgIGhyZWY6ICRidXR0b24uZGF0YSgnbGluaycpLFxuICAgICAgfTtcblxuICAgICAgbGV0IGNsaWNrSGFuZGxlciA9ICgpID0+IHtcbiAgICAgICAgbGV0IHt0aXRsZSwgc3JjLCBocmVmfSA9IGJ1dHRvbkRhdGE7XG4gICAgICAgIFxuICAgICAgICBwb3B1cC5pbWcuYXR0cignc3JjJywgc3JjKTtcbiAgICAgICAgcG9wdXAubmFtZS50ZXh0KHRpdGxlKTtcblxuICAgICAgICBwb3B1cC5pbnB1dC5saW5rLnZhbChocmVmKTtcbiAgICAgICAgcG9wdXAuaW5wdXQudGl0bGUudmFsKHRpdGxlKTtcbiAgICAgIH07XG5cblxuICAgICAgJGJ1dHRvbi5vbignY2xpY2snLCBjbGlja0hhbmRsZXIpO1xuICAgIH0pO1xuICB9XG59KSgpOyIsIjsoZnVuY3Rpb24oKSB7XG4gIGNvbnN0IGNvbnRhaW5lcnMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuanMtY3VzdG9tLWhvcml6b250YWwtc2Nyb2xsJyk7XG5cbiAgY29udGFpbmVycy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICB3aGVlbFByb3BhZ2F0aW9uOiBmYWxzZVxuICAgIH07XG4gICAgY29uc3QgY29udGFpbmVyID0gbmV3IFBlcmZlY3RTY3JvbGxiYXIoZWxlbWVudCwgb3B0aW9ucyk7XG4gIH0pOyBcbn0pKCk7IiwiOyhmdW5jdGlvbigpIHtcbiAgY29uc3QgY29udGFpbmVycyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5qcy1jdXN0b20tdmVydGljYWwtc2Nyb2xsJyk7XG5cbiAgY29udGFpbmVycy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xuICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICB3aGVlbFByb3BhZ2F0aW9uOiBmYWxzZVxuICAgIH07XG4gICAgY29uc3QgY29udGFpbmVyID0gbmV3IFBlcmZlY3RTY3JvbGxiYXIoZWxlbWVudCwgb3B0aW9ucyk7XG5cbiAgfSk7XG59KSgpOyIsIndpbmRvdy5zZWxlY3RJbml0ID0gZnVuY3Rpb24oKSB7XG4gIGxldCAkc2VsZWN0cyA9ICQoJy5qcy1mYWtlLXNlbGVjdCcpO1xuXG4gIGlmICgkc2VsZWN0cy5sZW5ndGgpIHtcbiAgICAkc2VsZWN0cy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgbGV0ICRzZWxlY3QgPSAkKHRoaXMpO1xuICAgICAgbGV0ICRsaXN0ID0gJHNlbGVjdC5maW5kKCcuZGV0YWlsZWQtc2VsZWN0X19saXN0Jyk7XG4gICAgICBsZXQgbGlzdExlbmd0aCA9ICRsaXN0LmNoaWxkcmVuKCkubGVuZ3RoO1xuICAgICAgbGV0ICRpdGVtcyA9ICRzZWxlY3QuZmluZCgnLmRldGFpbGVkLXNlbGVjdF9faXRlbScpO1xuXG4gICAgICBpZiAobGlzdExlbmd0aCkge1xuICAgICAgICAkc2VsZWN0LmFkZENsYXNzKCdkcm9wZG93bicpO1xuICAgICAgICBuZXcgUGVyZmVjdFNjcm9sbGJhcignLmRldGFpbGVkLXNlbGVjdF9fbGlzdCcsIHt3aGVlbFByb3BhZ2F0aW9uOiBmYWxzZX0pOyAvLyB1cGRhdGUgY3VzdG9tIHNjcm9sbFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgJHNlbGVjdC5yZW1vdmVDbGFzcygnZHJvcGRvd24nKTtcbiAgICAgIH1cblxuICAgICAgbGV0IHJlcGxhY2VTZWxlY3RlZEl0ZW0gPSBmdW5jdGlvbigkaXRlbSwgJHBsYWNlRm9yUmVuZGVyKSB7XG4gICAgICAgICRwbGFjZUZvclJlbmRlci5lbXB0eSgpO1xuICAgICAgICAkcGxhY2VGb3JSZW5kZXIuYXBwZW5kKCRpdGVtLmNsb25lKHRydWUpKTtcbiAgICAgIH07XG5cbiAgICAgICRpdGVtcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgJGl0ZW0gPSAkKHRoaXMpO1xuICAgICAgICBsZXQgJHBsYWNlRm9yUmVuZGVyID0gJHNlbGVjdC5maW5kKCcuZGV0YWlsZWQtc2VsZWN0X19jdXJyZW50Jyk7XG4gICAgICAgIGxldCAkcmFkaW8gPSAkaXRlbS5maW5kKCcuanMtc2VsZWN0LXJhZGlvJyk7XG4gICAgICAgIGxldCByYWRpb1ZhbCA9ICRyYWRpby52YWwoKTsgXG5cbiAgICAgICAgJGl0ZW0ub2ZmKCdjbGljay5zZWxlY3QnKS5vbignY2xpY2suc2VsZWN0JywgKCkgPT4ge1xuICAgICAgICAgICRyYWRpby5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG4gICAgICAgICAgXG4gICAgICAgICAgaWYgKCFsaXN0TGVuZ3RoKSByZXR1cm47IC8vIFRoZXJlIGlzIG5vIG5lZWQgdG8gb3BlbiBhIGJsYW5rIHNoZWV0IGFuZCBkbyBub3QgbmVlZCB0byByZWFkIGRhdGEgZm9yIHJlbmRlcmluZyBhZGRyZXNzZXNcblxuICAgICAgICAgICRzZWxlY3QudG9nZ2xlQ2xhc3MoJ2lzLW9wZW4nKTtcbiAgICAgICAgICAkbGlzdC50b2dnbGVDbGFzcygnaXMtb3BlbicpO1xuICAgICAgICAgIGlmICghKCRwbGFjZUZvclJlbmRlci5maW5kKCdpbnB1dCcpLnZhbCgpID09PSByYWRpb1ZhbCkpIHtcbiAgICAgICAgICAgIHJlcGxhY2VTZWxlY3RlZEl0ZW0oJGl0ZW0sICRwbGFjZUZvclJlbmRlcik7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgfSk7XG4gIH1cbn1cblxud2luZG93LnNlbGVjdEluaXQoKTsiLCI7KGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgY29uc3QgJGZpbHRlciA9ICQoJ1tqcy1maWx0ZXJdJyk7XG5cbiAgaWYgKCRmaWx0ZXIubGVuZ3RoKSB7XG4gICAgY29uc3QgJHRvZ2dsZSA9ICRmaWx0ZXIuZmluZCgnW2pzLWZpbHRlci10b2dnbGVdJyk7XG4gICAgY29uc3QgJGxpc3QgPSAkZmlsdGVyLmZpbmQoJ1tqcy1maWx0ZXItbGlzdF0nKTtcbiAgICAvKiBTaG93L0hpZGUgbGlzdCB3aXRoIGZpbGVycyAqL1xuICAgIGNvbnN0IHRvZ2dsZUhhbmRsZXIgPSAoZXZlbnQpID0+IHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAkdG9nZ2xlLnRvZ2dsZUNsYXNzKCdpcy1hY3RpdmUnKTtcbiAgICAgICRsaXN0LnNsaWRlVG9nZ2xlKCk7XG4gICAgfTtcbiAgICAkdG9nZ2xlLm9mZignY2xpY2suZmlsdGVyJykub24oJ2NsaWNrLmZpbHRlcicsIHRvZ2dsZUhhbmRsZXIpO1xuXG5cbiAgICBjb25zdCAkYnV0dG9uID0gJGZpbHRlci5maW5kKCdbanMtZmlsdGVyLWJ1dHRvbl0nKTtcbiAgICBjb25zdCAkaW5wdXRzID0gJGZpbHRlci5maW5kKCdpbnB1dCcpO1xuXG4gICAgY29uc3QgY2FsY3VsYXRlUG9zaXRpb25Ub3AgPSAoJGlucHV0KSA9PiB7XG4gICAgICBjb25zdCBpbnB1dFBhZ2VZID0gJGlucHV0Lm9mZnNldCgpLnRvcDtcbiAgICAgIGNvbnN0IGxpc3RQYWdlWSA9ICRsaXN0Lm9mZnNldCgpLnRvcDtcbiAgICAgIGNvbnN0IGJ1dHRvbkhlaWdodCA9ICRidXR0b24ub3V0ZXJIZWlnaHQoKTtcbiAgICAgIHJldHVybiBpbnB1dFBhZ2VZIC0gbGlzdFBhZ2VZIC0gYnV0dG9uSGVpZ2h0IC8gMjtcbiAgICB9O1xuXG5cbiAgICBjb25zdCBzaG93QnV0dG9uID0gKCkgPT4ge1xuICAgICAgY29uc3QgY2hlY2tlZEVsZW1zID0gJGZpbHRlci5maW5kKCdpbnB1dDpjaGVja2VkJykubGVuZ3RoO1xuICAgICAgaWYgKCFjaGVja2VkRWxlbXMpIHtcbiAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnaXMtYWN0aXZlJyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgICAgXG4gICAgICAkYnV0dG9uLmFkZENsYXNzKCdpcy1hY3RpdmUnKTtcbiAgICAgIHJldHVybiBjaGVja2VkRWxlbXM7XG4gICAgfTtcblxuICAgICRpbnB1dHMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICBjb25zdCAkaW5wdXQgPSAkKHRoaXMpO1xuICAgICAgY29uc3QgaW5wdXRDbGlja0hhbmRsZXIgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgY29uc3QgJHRhcmdldCA9ICQodGhpcyk7XG4gICAgICAgICRidXR0b24uY3NzKHt0b3A6IGNhbGN1bGF0ZVBvc2l0aW9uVG9wKCR0YXJnZXQpfSk7XG4gICAgICAgIGNvbnNvbGUubG9nKHNob3dCdXR0b24oKSk7XG4gICAgICB9O1xuXG4gICAgICAkaW5wdXQub2ZmKCdjbGljay5idXR0b24nKS5vbignY2xpY2suYnV0dG9uJywgaW5wdXRDbGlja0hhbmRsZXIpO1xuICAgIH0pO1xuICB9XG59KSgpOyIsIjsoZnVuY3Rpb24gKCl7XG4gICd1c2Ugc3RyaWN0JztcbiAgY29uc3QgJGxpc3RzID0gJCgnW2pzLWZpbHRlci1saXN0XScpO1xuXG4gIGlmICgkbGlzdHMubGVuZ3RoKSB7XG4gICAgJGxpc3RzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgY29uc3QgJHRvZ2dsZSA9ICQoJ1tqcy1maWx0ZXItdG9nZ2xlXScpO1xuICAgICAgY29uc3QgJGxpc3QgPSAkKHRoaXMpO1xuXG4gICAgICBjb25zdCBjbGlja0hhbmRsZXIgPSAoZXZuZXQpID0+IHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgJHRvZ2dsZS50b2dnbGVDbGFzcygnaXMtYWN0aXZlJyk7XG4gICAgICAgICRsaXN0LnNsaWRlVG9nZ2xlKCk7XG4gICAgICB9XG4gICAgICAkdG9nZ2xlLm9mZignY2xpY2suZmlsdGVyJykub24oJ2NsaWNrLmZpbHRlcicsIGNsaWNrSGFuZGxlcik7XG4gICAgfSk7XG4gIH1cbn0pKCk7IiwiOyhmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICBjb25zdCAkZm9ybXMgPSAkKCdbanMtZm9ybV0nKTtcblxuICBpZiAoJGZvcm1zLmxlbmd0aCkge1xuXG4gICAgY29uc3QgbWFza3MgPSB7XG4gICAgICB0ZWw6ICcrNyAoOTk5KSAtIDk5OSAtIDk5OTknLFxuICAgICAgdGV4dDogJ1thLXpBLVrQkC3Qr9CwLdGPIF0qJ1xuICAgIH1cblxuICAgICRmb3Jtcy5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgIGNvbnN0ICRmb3JtID0gJCh0aGlzKTtcbiAgICAgIGNvbnN0ICRidXR0b24gPSAkZm9ybS5maW5kKCdidXR0b25bdHlwZT1cInN1Ym1pdFwiXScpO1xuICAgICAgY29uc3QgcG9wdXBJZCA9ICRmb3JtLmRhdGEoJ3NyYycpO1xuICAgICAgY29uc3QgJGlucHV0cyA9ICRmb3JtLmZpbmQoJ2lucHV0Jyk7XG4gICAgICBcbiAgICAgICRpbnB1dHMuZWFjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnN0ICRpbnB1dCA9ICQodGhpcyk7XG4gICAgICAgIGNvbnN0IHR5cGUgPSAkaW5wdXQuYXR0cigndHlwZScpO1xuXG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgIGNhc2UgJ3RlbCc6XG4gICAgICAgICAgICAkaW5wdXQuaW5wdXRtYXNrKHtcbiAgICAgICAgICAgICAgbWFzazogbWFza3MudGVsLFxuICAgICAgICAgICAgICBhdXRvVW5tYXNrOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3RleHQnOiBcbiAgICAgICAgICAgICRpbnB1dC5pbnB1dG1hc2soe3JlZ2V4OiBtYXNrcy50ZXh0fSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgJGlucHV0LmlucHV0bWFzaygpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgY29uc3QgY2xpY2tIYW5kbGVyID0gKGV2ZW50KSA9PiB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB2YWxpZGF0aW9uID0gW107XG4gICAgICAgICRpbnB1dHMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkKHRoaXMpO1xuICAgICAgICAgIFxuICAgICAgICAgIGlmICgkaW5wdXQuaW5wdXRtYXNrKCdpc0NvbXBsZXRlJykpIHtcbiAgICAgICAgICAgIHZhbGlkYXRpb24ucHVzaCgkaW5wdXQuaW5wdXRtYXNrKCdpc0NvbXBsZXRlJykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKHZhbGlkYXRpb24ubGVuZ3RoID09PSAkaW5wdXRzLmxlbmd0aCAmJiAkZm9ybVswXS5jaGVja1ZhbGlkaXR5KCkpIHtcbiAgICAgICAgICAkZm9ybS50cmlnZ2VyKCdzdWJtaXQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkZm9ybVswXS5yZXBvcnRWYWxpZGl0eSgpO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICAkYnV0dG9uLm9mZignY2xpY2sudmFsaWRhdGlvbicpLm9uKCdjbGljay52YWxpZGF0aW9uJywgY2xpY2tIYW5kbGVyKTtcbiAgICB9KTtcbiAgfVxufSkoKTtcbiIsIjsoZnVuY3Rpb24oKSB7XG4gIGNvbnN0ICRib2R5ID0gJCgnYm9keScpO1xuICBjb25zdCAkaGVhZGVyID0gJCgnLmJvZHlfX2hlYWRlcicpO1xuICBjb25zdCAkdmlzaWJsZVJvdyA9ICRoZWFkZXIuZmluZCgnLmhlYWRlci1taWQnKTtcbiAgY29uc3QgaGVhZGVySGVpZ2h0ID0gJGhlYWRlci5vdXRlckhlaWdodCgpO1xuXG4gIGNvbnN0IHNjcm9sbEhhbmxkZXIgPSAoKSA9PiB7XG4gICAgaWYgKCQod2luZG93KS5zY3JvbGxUb3AoKSA+IGhlYWRlckhlaWdodCkge1xuICAgICAgJGJvZHkuY3NzKHsncGFkZGluZy10b3AnOiBoZWFkZXJIZWlnaHR9KTtcbiAgICAgICRoZWFkZXIuYWRkQ2xhc3MoJ2lzLXNjcm9sbGluZycpO1xuICAgICAgJHZpc2libGVSb3cuYWRkQ2xhc3MoJ2lzLW9ubHknKTtcbiAgICB9XG5cbiAgICBpZiAoJCh3aW5kb3cpLnNjcm9sbFRvcCgpIDwgaGVhZGVySGVpZ2h0KSB7XG4gICAgICAkYm9keS5jc3MoeydwYWRkaW5nLXRvcCc6IDB9KTtcbiAgICAgICRoZWFkZXIucmVtb3ZlQ2xhc3MoJ2lzLXNjcm9sbGluZycpO1xuICAgICAgJHZpc2libGVSb3cucmVtb3ZlQ2xhc3MoJ2lzLW9ubHknKTtcbiAgICB9XG4gIH07XG4gICQod2luZG93KS5zY3JvbGwoc2Nyb2xsSGFubGRlcik7XG59KSgpOyIsIjsoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICBjb25zdCAkY29udGFpbmVyID0gJCgnW2pzLW1lcml0c10nKTtcblxuICBpZiAoJGNvbnRhaW5lci5sZW5ndGgpIHtcbiAgICBjb25zdCAkYnV0dG9ucyA9ICQoJ1tqcy1tZXJpdC1idXR0b25dJyk7XG4gICAgbGV0ICRwcmV2aW91c0J1dHRvbiA9IG51bGw7XG4gICAgXG4gICAgJGJ1dHRvbnMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIGNvbnN0ICRidXR0b24gPSAkKHRoaXMpO1xuICAgICAgY29uc3QgJGRpc3BsYXkgPSAkY29udGFpbmVyLmZpbmQoJ1tqcy1tZXJpdC1kaXNwbGF5XScpO1xuICAgICAgY29uc3QgJHRpdGxlID0gJGRpc3BsYXkuZmluZCgnW2pzLW1lcml0LXRpdGxlXScpO1xuICAgICAgY29uc3QgJHBhcmFncmFwaCA9ICRkaXNwbGF5LmZpbmQoJ3AnKTtcblxuICAgICAgY29uc3QgY2hlY2tQcmV2aW91c0J1dHRvbiA9ICgkdGFyZ2V0KSA9PiB7XG4gICAgICAgIC8qIGlmIGl0IG51bGwgKi9cbiAgICAgICAgaWYgKCEkcHJldmlvdXNCdXR0b24pIHtcbiAgICAgICAgICAkdGFyZ2V0LmFkZENsYXNzKCdpcy1hY3RpdmUnKTtcbiAgICAgICAgICAkcHJldmlvdXNCdXR0b24gPSAkdGFyZ2V0O1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gaWYgdGhlbSBzYW1lXG4gICAgICAgIGlmICgkcHJldmlvdXNCdXR0b24gPT09ICR0YXJnZXQpIHJldHVybjtcblxuICAgICAgICAvLyBpZiB0aGVtIHZhcmlvdXNcbiAgICAgICAgaWYgKCRwcmV2aW91c0J1dHRvbiAhPT0gJHRhcmdldCkge1xuICAgICAgICAgICRwcmV2aW91c0J1dHRvbi5yZW1vdmVDbGFzcygnaXMtYWN0aXZlJyk7XG4gICAgICAgICAgJHRhcmdldC5hZGRDbGFzcygnaXMtYWN0aXZlJyk7XG4gICAgICAgICAgJHByZXZpb3VzQnV0dG9uID0gJHRhcmdldDtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCBjbGlja0hhbmRsZXIgPSAoZXZlbnQpID0+IHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgY29uc3QgJHRhcmdldCA9ICQodGhpcyk7XG4gICAgICAgIGNoZWNrUHJldmlvdXNCdXR0b24oJHRhcmdldCk7XG5cbiAgICAgICAgY29uc3QgeyB0aXRsZSwgcGFyYWdyYXBoIH0gPSAkdGFyZ2V0LmRhdGEoKTtcbiAgICAgICAgJHRpdGxlLmh0bWwoYCR7dGl0bGV9YCk7XG4gICAgICAgICRwYXJhZ3JhcGgudGV4dChwYXJhZ3JhcGgpO1xuICAgICAgfTtcblxuICAgICAgJGJ1dHRvbi5vZmYoJ2NsaWNrLm1lcml0Jykub24oJ2NsaWNrLm1lcml0JywgY2xpY2tIYW5kbGVyKTtcbiAgICB9KTtcblxuXG4gICAgJCh3aW5kb3cpLnJlc2l6ZSgoZXZlbnQpID0+IHtcbiAgICAgIGNvbnN0ICR2aWV3cG9ydCA9ICQoZXZlbnQudGFyZ2V0KTtcblxuICAgICAgaWYgKCR2aWV3cG9ydC5pbm5lcldpZHRoKCkgPCA5OTMpIHtcbiAgICAgICAgJGJ1dHRvbnMucmVtb3ZlQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59KSgpOyIsIjsoZnVuY3Rpb24oKSB7XG4gIG9iamVjdEZpdEltYWdlcygpO1xufSkoKTsiLCI7KGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIGNvbnN0ICRzY2VuZXMgPSAkKCdbanMtcGFyYWxsYXhdJyk7XG5cbiAgaWYgKCRzY2VuZXMubGVuZ3RoKSB7XG4gICAgJHNjZW5lcy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgY29uc3QgJHNjZW5lID0gJCh0aGlzKTtcbiAgICAgICRzY2VuZS5wYXJhbGxheGlmeSh7XG4gICAgICAgIHBvc2l0aW9uUHJvcGVydHk6ICd0cmFuc2Zvcm0nXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufSgpKTsiLCI7KGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIGNvbnN0ICRidXR0b25zID0gJCgnW2pzLXBvcHVwLW9wZW5dJyk7XG5cbiAgaWYgKCRidXR0b25zLmxlbmd0aCkge1xuICAgIGNvbnN0ICRib2R5ID0gJCgnYm9keScpO1xuICAgIGNvbnN0ICRzY3JvbGxCYXJXaWR0aCA9ICh3aW5kb3cuaW5uZXJXaWR0aCAtICQod2luZG93KS53aWR0aCgpKTtcblxuICAgICRidXR0b25zLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICBjb25zdCAkYnV0dG9uID0gJCh0aGlzKTtcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgIGhpZGVTY3JvbGxiYXI6IHRydWUsXG4gICAgICAgIHRvdWNoOiBmYWxzZSxcbiAgICAgICAgYnRuVHBsIDoge1xuICAgICAgICAgIHNtYWxsQnRuIDogJydcbiAgICAgICAgfSxcbiAgICAgICAgYmVmb3JlU2hvdzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgLy8gIEFkZCBhbm90aGVyIGJnIGNvbG9yXG4gICAgICAgICAgJCgnLmZhbmN5Ym94LWJnJykuYWRkQ2xhc3MoJGJ1dHRvbi5kYXRhKCdzcmMnKS5zbGljZSgxKSk7XG4gICAgICAgICAgY29uc3QgJGhlYWRlciA9ICRib2R5LmZpbmQoJy5ib2R5X19oZWFkZXInKTtcblxuICAgICAgICAgIGNvbnN0IGJvZHlTdHlsZXMgPSB7XG4gICAgICAgICAgICAnb3ZlcmZsb3cteSc6ICdoaWRkZW4nLFxuICAgICAgICAgICAgJ3BhZGRpbmctcmlnaHQnOiBgJHskc2Nyb2xsQmFyV2lkdGh9cHhgLFxuICAgICAgICAgICAgJ21hcmdpbic6ICcwIGF1dG8nXG4gICAgICAgICAgfTtcbiAgICAgICAgICAkYm9keS5jc3MoYm9keVN0eWxlcyk7XG5cbiAgICAgICAgICBpZiAoJGhlYWRlci5oYXNDbGFzcygnaXMtc2Nyb2xsaW5nJykpIHtcbiAgICAgICAgICAgICRoZWFkZXIuY3NzKHsncGFkZGluZy1yaWdodCc6IGAkeyRzY3JvbGxCYXJXaWR0aH1weGB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGFmdGVyQ2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIC8vICBBZGQgYW5vdGhlciBiZyBjb2xvclxuICAgICAgICAgICQoJy5mYW5jeWJveC1iZycpLnJlbW92ZUNsYXNzKCRidXR0b24uZGF0YSgnc3JjJykuc2xpY2UoMSkpO1xuICAgICAgICAgIGNvbnN0ICRoZWFkZXIgPSAkYm9keS5maW5kKCcuYm9keV9faGVhZGVyJyk7XG5cbiAgICAgICAgICBjb25zdCBib2R5U3R5bGVzID0ge1xuICAgICAgICAgICAgJ292ZXJmbG93LXknOiAndmlzaWJsZScsXG4gICAgICAgICAgICAncGFkZGluZy1yaWdodCc6IDAsXG4gICAgICAgICAgICAnbWFyZ2luJzogMFxuICAgICAgICAgIH07XG4gICAgICAgICAgJGJvZHkuY3NzKGJvZHlTdHlsZXMpO1xuXG4gICAgICAgICAgaWYgKCRoZWFkZXIuaGFzQ2xhc3MoJ2lzLXNjcm9sbGluZycpKSB7XG4gICAgICAgICAgICAkaGVhZGVyLmNzcyh7J3BhZGRpbmctcmlnaHQnOiAnJ30pO1xuICAgICAgICAgIH1cblxuICAgICAgICB9XG4gICAgICB9O1xuICBcbiAgICAgICRidXR0b24uZmFuY3lib3gob3B0aW9ucyk7XG4gICAgfSk7XG4gIH1cbiAgXG59KCkpO1xuIiwiOyhmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGNvbnN0ICRmaWVsZHMgPSAkKCdbanMtbGF5b3V0XScpO1xuXG4gIGlmICgkZmllbGRzLmxlbmd0aCkge1xuICAgICRmaWVsZHMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIGNvbnN0ICRmaWVsZENvbnRhaW5lciA9ICQoJ1tqcy1sYXlvdXQtY29udGFpbmVyXScpO1xuICAgICAgY29uc3QgJGZpZWxkID0gJCh0aGlzKTtcbiAgICAgIGNvbnN0ICRsYWJlbCA9ICRmaWVsZC5wYXJlbnQoKTsgLy8gdHlwZSBpcyBzdG9yaW5nIGluIHRoZSBsYWJlbFxuICAgICAgY29uc3QgdmlldyA9ICRsYWJlbC5kYXRhKCd2aWV3Jyk7XG5cbiAgICAgIC8qIEVsZW1lbnRzIHdpbGwgcmVwcmVzZW50IHRoZW0gc2VsZiB1c2luZyBhIGNzcyBjbGFzcy4gKi9cbiAgICAgIGNvbnN0ICRpdGVtcyA9ICQoJ1tqcy1jYXRhbG9nLWl0ZW1dJyk7XG4gICAgICBjb25zdCAkcHJvZHVjdHMgPSAkKCdbanMtcHJvZHVjdF0nKTtcbiAgICAgIGNvbnN0ICRsaXN0ID0gJCgnW2pzLXByb2R1Y3QtbGlzdF0nKTtcblxuICAgICAgY29uc3Qgb25DaGFuZ2VIYW5kbGVyID0gKCkgPT4ge1xuICAgICAgICBpZiAodmlldyA9PT0gJ3JvdycpIHtcbiAgICAgICAgICAkaXRlbXMuYWRkQ2xhc3MoJ2lzLWZ1bGwnKTtcbiAgICAgICAgICAkcHJvZHVjdHMuYWRkQ2xhc3MoJ2lzLXJvdycpO1xuICAgICAgICAgICRsaXN0LmFkZENsYXNzKCdyb3ctdmlldycpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2aWV3ID09PSAnZGVmYXVsdCcpIHtcbiAgICAgICAgICBpZiAoJGl0ZW1zLmhhc0NsYXNzKCdpcy1mdWxsJykgJiYgJHByb2R1Y3RzLmhhc0NsYXNzKCdpcy1yb3cnKSkge1xuICAgICAgICAgICAgJGl0ZW1zLnJlbW92ZUNsYXNzKCdpcy1mdWxsJyk7XG4gICAgICAgICAgICAkcHJvZHVjdHMucmVtb3ZlQ2xhc3MoJ2lzLXJvdycpO1xuICAgICAgICAgICAgJGxpc3QucmVtb3ZlQ2xhc3MoJ3Jvdy12aWV3Jyk7XG4gICAgICAgICAgICByZXR1cm4gO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybjsgLy8gSWYgdGhlIGxheW91dCB3YXMgZGVmYXVsdFxuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICAkZmllbGQub2ZmKCdjaGFuZ2UubGF5b3V0Jykub24oJ2NoYW5nZS5sYXlvdXQnLCBvbkNoYW5nZUhhbmRsZXIpO1xuICAgIFxuICAgICAgY29uc3QgcmVzaXplSGFuZGxlciA9IChldmVudCkgPT4ge1xuICAgICAgICBjb25zdCAkbWF4Vmlld1dpZHRoID0gMTExNTtcbiAgICAgICAgY29uc3QgJHRhcmdldCA9ICQoZXZlbnQudGFyZ2V0KTtcbiAgICAgICAgY29uc3QgY3VycmVudFZpZXdXaWR0aCA9ICR0YXJnZXQuaW5uZXJXaWR0aCgpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGN1cnJlbnRWaWV3V2lkdGggPCAxMTE1KSB7XG4gICAgICAgICAgJHByb2R1Y3RzLnJlbW92ZUNsYXNzKCdpcy1yb3cnKTtcbiAgICAgICAgICAkaXRlbXMucmVtb3ZlQ2xhc3MoJ2lzLWZ1bGwnKTtcbiAgICAgICAgICAkbGlzdC5yZW1vdmVDbGFzcygncm93LXZpZXcnKTtcbiAgICAgICAgICAkZmllbGRDb250YWluZXIuYWRkQ2xhc3MoJ2lzLWhpZGRlbicpO1xuICAgICAgICAgICQoJ1tkYXRhLXZpZXc9XCJkZWZhdWx0XCJdJykuZmluZCgnaW5wdXQnKS5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG5cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY3VycmVudFZpZXdXaWR0aCA+PSAxMTE1KSB7XG4gICAgICAgICAgJGZpZWxkQ29udGFpbmVyLnJlbW92ZUNsYXNzKCdpcy1oaWRkZW4nKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgIH07XG4gICAgXG4gICAgICAkKHdpbmRvdykucmVzaXplKHJlc2l6ZUhhbmRsZXIpO1xuICAgIH0pO1xuICB9XG59KCkpOyIsIjsoZnVuY3Rpb24oKXtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGNvbnN0ICRyZXZpZXdzID0gJCgnW2pzLXJldmlld10nKTtcblxuICBpZiAoJHJldmlld3MubGVuZ3RoKSB7XG4gICAgJHJldmlld3MuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIGNvbnN0ICRyZXZpZXcgPSAkKHRoaXMpO1xuICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICRyZXZpZXcuZmluZCgnLnJldmlld19fd3JhcHBlcicpO1xuXG4gICAgICBjb25zdCBjaGVja092ZXJmbG93ID0gKGVsZW1lbnQpID0+IHtcbiAgICAgICAgY29uc3QgY2hlY2sgPSAoZWxlbWVudFswXS5zY3JvbGxIZWlnaHQgPiBlbGVtZW50LmlubmVySGVpZ2h0KCkpPyB0cnVlOiBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIGNoZWNrPyAkcmV2aWV3LmFkZENsYXNzKCdpcy1vdmVyZmxvdycpOiBudWxsO1xuICAgICAgfTtcblxuICAgICAgY2hlY2tPdmVyZmxvdygkY29udGFpbmVyKTtcbiAgICB9KTtcbiAgfVxufSgpKTsiLCI7KGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgY29uc3QgJHNjcm9sbHMgPSAkKCdbanMtc2Nyb2xsLXVwXScpO1xuICBpZiAoJHNjcm9sbHMubGVuZ3RoICE9IDApIHtcbiAgICAkc2Nyb2xscy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgY29uc3QgJHNjcm9sbCA9ICQodGhpcyk7XG4gICAgICBcbiAgICAgICQod2luZG93KS5zY3JvbGwoaGlkZUFuY2hvcik7XG4gICAgICBcbiAgICAgIGZ1bmN0aW9uIGhpZGVBbmNob3IgKGV2ZW50KSB7XG4gICAgICAgIGNvbnN0ICR3aW5kb3cgPSAkKHRoaXMpO1xuICAgICAgICBjb25zdCBvbmVUaGlyZERvY3VtZW50SGVpZ2h0ID0gJHdpbmRvdy5oZWlnaHQoKSAvIDI7IFxuXG4gICAgICAgIGlmICgkd2luZG93LnNjcm9sbFRvcCgpID49IG9uZVRoaXJkRG9jdW1lbnRIZWlnaHQpIHtcbiAgICAgICAgICAkc2Nyb2xsLmFkZENsYXNzKCdpcy1hY3RpdmUnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAkc2Nyb2xsLnJlbW92ZUNsYXNzKCdpcy1hY3RpdmUnKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAkc2Nyb2xsLm9mZignY2xpY2suc2Nyb2xsVXAnKS5vbignY2xpY2suc2Nyb2xsVXAnLCBzY3JvbGwpO1xuXG4gICAgICBmdW5jdGlvbiBzY3JvbGwoZXZlbnQpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgY29uc3QgJHRhcmdldCA9ICQoZXZlbnQuJHRhcmdldCk7XG4gICAgICAgICQoJ2JvZHksaHRtbCcpLmFuaW1hdGUoe3Njcm9sbFRvcDowfSw4MDApO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59KCkpO1xuIiwiOyhmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICBjb25zdCAkc2VsZWN0cz0gJCgnW2pzLXNlbGVjdF0nKTtcblxuICBpZiAoJHNlbGVjdHMubGVuZ3RoKSB7XG4gICAgJHNlbGVjdHMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIGNvbnN0ICRzZWxlY3QgPSAkKHRoaXMpO1xuICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgICAgLy8gcmVtb3ZlIHNlYXJjaC1ib3hcbiAgICAgICAgbWluaW11bVJlc3VsdHNGb3JTZWFyY2g6IC0xLFxuICAgICAgICB3aWR0aDogJ3Jlc29sdmUnXG4gICAgICB9O1xuXG4gICAgICAkc2VsZWN0LnNlbGVjdDIob3B0aW9ucyk7XG4gICAgfSk7XG4gIH1cbn0oKSk7IiwiOyhmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGNvbnN0ICRzZXRzID0gJCgnW2pzLXNldF0nKTtcbiAgXG4gIGlmICgkc2V0cy5sZW5ndGgpIHtcbiAgICAvKiBBbiBldmVudCBoYW5kbGVyIGZvciB0aGUgZnVuY3Rpb24gb2YgY2xvc2luZyAvIG9wZW5pbmcgc2VwYXJhdGUgZ3JvdXBzIG9mIGZpZWxkcyBpbiB0aGUgc2V0LiAqL1xuXG4gICAgLy8gY29uc3Qgdmlld1dpZHRoID0gJCgnYm9keScpLndpZHRoKCk7XG4gICAgXG4gICAgJHNldHMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIGNvbnN0ICRzZXQgPSAkKHRoaXMpO1xuICAgICAgY29uc3QgJHRvZ2dsZSA9ICRzZXQuZmluZCgnW2pzLXNldC10b2dnbGVdJyk7XG4gICAgICAvLyAkdG9nZ2xlLmFkZENsYXNzKCh2aWV3V2lkdGggPiA5OTIpPyAnaXMtYWN0aXZlJzogbnVsbCk7XG5cbiAgICAgIGNvbnN0ICRsaXN0ID0gJHNldC5maW5kKCdbanMtc2V0LWxpc3RdJyk7XG5cblxuICAgICAgY29uc3QgY2xpY2tIYW5kbGVyID0gKGV2bmV0KSA9PiB7XG4gICAgICAgICR0b2dnbGUudG9nZ2xlQ2xhc3MoJ2lzLWFjdGl2ZScpO1xuICAgICAgICAkbGlzdC5zbGlkZVRvZ2dsZSgpO1xuICAgICAgfVxuXG4gICAgICAkdG9nZ2xlLm9mZignY2xpY2suc2V0Jykub24oJ2NsaWNrLnNldCcsIGNsaWNrSGFuZGxlcik7XG4gICAgfSk7XG4gIH1cbn0pKCk7IiwiOyhmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICBcbiAgY29uc3QgJG5hdiA9ICQoJ1tqcy1zaXRlLW5hdmlnYXRpb25dJyk7XG5cbiAgaWYgKCRuYXYubGVuZ3RoKSB7XG4gICAgY29uc3QgJHRvZ2dsZSA9ICRuYXYuZmluZCgnW2pzLXNpdGUtbmF2aWdhdGlvbi10b2dnbGVdJyk7XG4gICAgY29uc3QgJGNvbnRhaW5lciA9ICRuYXYuZmluZCgnW2pzLXNpdGUtbmF2aWdhdGlvbi1jb250YWluZXJdJyk7XG5cbiAgICBjb25zdCBjbGlja0hhbmRsZXIgPSAoKSA9PiB7XG4gICAgICAkdG9nZ2xlLnRvZ2dsZUNsYXNzKCdpcy1hY3RpdmUnKTtcbiAgICAgICRjb250YWluZXIuc2xpZGVUb2dnbGUoKTtcbiAgICB9O1xuXG4gICAgJHRvZ2dsZS5vZmYoJ2NsaWNrLnNsaWRlTmF2Jykub24oJ2NsaWNrLnNsaWRlTmF2JywgY2xpY2tIYW5kbGVyKTtcbiAgfVxufSkoKTsiLCI7KGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgY29uc3QgJHNsaWRlcnMgPSAkKCdbanMtc2ltcGxlLXNsaWRlcl0nKTtcblxuICBpZiAoJHNsaWRlcnMubGVuZ3RoKSB7XG4gICAgJHNsaWRlcnMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIGNvbnN0ICRzbGlkZXIgPSAkKHRoaXMpO1xuICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgICAgc2xpZGVzVG9TaG93OiAxLFxuICAgICAgICB1c2VUcmFuc2Zvcm06IHRydWUsXG4gICAgICAgIHNwZWVkOiA0MDAsXG4gICAgICAgIGNzc0Vhc2U6ICdjdWJpYy1iZXppZXIoMC43NywgMCwgMC4xOCwgMSknLFxuICAgICAgICBhcnJvd3M6IGZhbHNlLFxuICAgICAgICBkb3RzOiB0cnVlLFxuICAgICAgICBkb3RzQ2xhc3M6ICdzbGlkZXJfX2RvdHMnLFxuICAgICAgICBjdXN0b21QYWdpbmc6IGZ1bmN0aW9uKHNsaWRlciwgaSkge1xuICAgICAgICAgIHJldHVybiAnPHNwYW4gY2xhc3M9XCJzbGlkZXJfX2RvdFwiPjwvc3Bhbj4nO1xuICAgICAgICB9LFxuICAgICAgfTtcblxuICAgICAgJHNsaWRlci5zbGljayhvcHRpb25zKTtcbiAgICB9KTtcbiAgfVxufSkoKTsiLCI7KGZ1bmN0aW9uICgpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGNvbnN0ICRnb29kcyA9ICQoJ1tqcy1nb29kXScpO1xuXG4gIGlmICgkZ29vZHMubGVuZ3RoKSB7XG4gICAgJGdvb2RzLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgY29uc3QgJGdvb2QgPSAkKHRoaXMpO1xuXG4gICAgICBjb25zdCAkc2xpZGVyU2luZ2xlID0gJGdvb2QuZmluZCgnW2pzLXN5bmMtc2xpZGVyLXNpbmdsZV0nKTtcblxuICAgICAgJHNsaWRlclNpbmdsZS5zbGljayh7XG4gICAgICAgIHNsaWRlc1RvU2hvdzogMSxcbiAgICAgICAgc2xpZGVzVG9TY3JvbGw6IDEsXG4gICAgICAgIGZhZGU6IGZhbHNlLFxuICAgICAgICBpbmZpbml0ZTogZmFsc2UsXG4gICAgICAgIHVzZVRyYW5zZm9ybTogdHJ1ZSxcbiAgICAgICAgc3BlZWQ6IDQwMCxcbiAgICAgICAgY3NzRWFzZTogJ2N1YmljLWJlemllcigwLjc3LCAwLCAwLjE4LCAxKSdcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCAkc2xpZGVyTmF2ID0gJGdvb2QuZmluZCgnW2pzLXN5bmMtc2xpZGVyLW5hdl0nKTtcblxuICAgICAgJHNsaWRlck5hdi5vbignaW5pdCcsIGZ1bmN0aW9uIChldmVudCwgc2xpY2spIHtcbiAgICAgICAgJCgnLnN5bmMtc2xpZGVyX25hdiAuc2xpY2stc2xpZGUuc2xpY2stY3VycmVudCcpLmFkZENsYXNzKCdpcy1hY3RpdmUnKTtcbiAgICAgIH0pLnNsaWNrKHtcbiAgICAgICAgcHJldkFycm93OiBudWxsLFxuICAgICAgICBuZXh0QXJyb3c6IG51bGwsXG4gICAgICAgIHNsaWRlc1RvU2hvdzogNCxcbiAgICAgICAgc2xpZGVzVG9TY3JvbGw6IDEsXG4gICAgICAgIGRvdHM6IGZhbHNlLFxuICAgICAgICBmb2N1c09uU2VsZWN0OiBmYWxzZSxcbiAgICAgICAgaW5maW5pdGU6IGZhbHNlLFxuICAgICAgICB2YXJpYWJsZVdpZHRoOiB0cnVlLFxuICAgICAgICBzd2lwZTogdHJ1ZSxcbiAgICAgICAgcmVzcG9uc2l2ZTogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGJyZWFrcG9pbnQ6IDU3NixcbiAgICAgICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAgICAgIHNsaWRlc1RvU2hvdzogM1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfSk7XG5cbiAgICAgICRzbGlkZXJTaW5nbGUub24oJ2FmdGVyQ2hhbmdlJywgZnVuY3Rpb24gKGV2ZW50LCBzbGljaywgY3VycmVudFNsaWRlKSB7XG4gICAgICAgICRzbGlkZXJOYXYuc2xpY2soJ3NsaWNrR29UbycsIGN1cnJlbnRTbGlkZSk7XG4gICAgICAgICAgXG4gICAgICAgIHZhciBjdXJycmVudE5hdlNsaWRlRWxlbSA9ICcuc3luYy1zbGlkZXJfbmF2IC5zbGljay1zbGlkZVtkYXRhLXNsaWNrLWluZGV4PVwiJyArIGN1cnJlbnRTbGlkZSArICdcIl0nO1xuICAgIFxuICAgICAgICAkKCcuc3luYy1zbGlkZXJfbmF2IC5zbGljay1zbGlkZS5pcy1hY3RpdmUnKS5yZW1vdmVDbGFzcygnaXMtYWN0aXZlJyk7XG4gICAgXG4gICAgICAgICQoY3VycnJlbnROYXZTbGlkZUVsZW0pLmFkZENsYXNzKCdpcy1hY3RpdmUnKTtcbiAgICAgIH0pO1xuXG4gICAgICAkc2xpZGVyTmF2Lm9uKCdjbGljaycsICcuc2xpY2stc2xpZGUnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICB2YXIgZ29Ub1NpbmdsZVNsaWRlID0gJCh0aGlzKS5kYXRhKCdzbGljay1pbmRleCcpO1xuXG4gICAgICAgICRzbGlkZXJTaW5nbGUuc2xpY2soJ3NsaWNrR29UbycsIGdvVG9TaW5nbGVTbGlkZSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufSkoKTsiLCI7KGZ1bmN0aW9uKCkge1xuICBsZXQgcmF0aW5nID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLmpzLWNoYW5nZS1yYXRpbmcnKTtcbiAgaWYgKHJhdGluZykge1xuICAgIGxldCByYXRpbmdJbnB1dCA9IHJhdGluZy5xdWVyeVNlbGVjdG9yKCdpbnB1dCcpO1xuICAgIGxldCByYXRpbmdJdGVtID0gcmF0aW5nLnF1ZXJ5U2VsZWN0b3JBbGwoJy5yYXRpbmdfX2l0ZW0nKTtcbiAgXG4gICAgcmF0aW5nLm9uY2xpY2sgPSBmdW5jdGlvbihlKXtcbiAgICAgIGxldCB0YXJnZXQgPSBlLnRhcmdldDtcbiAgICAgIGlmKHRhcmdldC5jbGFzc0xpc3QuY29udGFpbnMoJ3JhdGluZ19faXRlbScpKXtcbiAgICAgICAgcmVtb3ZlQ2xhc3MocmF0aW5nSXRlbSwnY3VycmVudC1hY3RpdmUnKVxuICAgICAgICB0YXJnZXQuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJywnY3VycmVudC1hY3RpdmUnKTtcbiAgICAgICAgcmF0aW5nSW5wdXQudmFsdWUgPSB0YXJnZXQuZGF0YXNldC5yYXRlO1xuICAgICAgfVxuICAgIH1cbiAgXG4gICAgcmF0aW5nLm9ubW91c2VvdmVyID0gZnVuY3Rpb24oZSkge1xuICAgICAgbGV0IHRhcmdldCA9IGUudGFyZ2V0O1xuICAgICAgaWYodGFyZ2V0LmNsYXNzTGlzdC5jb250YWlucygncmF0aW5nX19pdGVtJykpe1xuICAgICAgICByZW1vdmVDbGFzcyhyYXRpbmdJdGVtLCdhY3RpdmUnKVxuICAgICAgICB0YXJnZXQuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG4gICAgICAgIG1vdXNlT3ZlckFjdGl2ZUNsYXNzKHJhdGluZ0l0ZW0pXG4gICAgICB9XG4gICAgfVxuICBcbiAgICByYXRpbmcub25tb3VzZW91dCA9IGZ1bmN0aW9uKCl7XG4gICAgICBhZGRDbGFzcyhyYXRpbmdJdGVtLCdhY3RpdmUnKTtcbiAgICAgIG1vdXNlT3V0QWN0aXZlQ2xhcyhyYXRpbmdJdGVtKTtcbiAgICB9XG4gIFxuICAgIGZ1bmN0aW9uIHJlbW92ZUNsYXNzKGFycikge1xuICAgICAgZm9yKGxldCBpID0gMCwgaUxlbiA9IGFyci5sZW5ndGg7IGkgPGlMZW47IGkgKyspIHtcbiAgICAgICAgZm9yKGxldCBqID0gMTsgaiA8IGFyZ3VtZW50cy5sZW5ndGg7IGogKyspIHtcbiAgICAgICAgICByYXRpbmdJdGVtW2ldLmNsYXNzTGlzdC5yZW1vdmUoYXJndW1lbnRzW2pdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBhZGRDbGFzcyhhcnIpIHtcbiAgICAgIGZvcihsZXQgaSA9IDAsIGlMZW4gPSBhcnIubGVuZ3RoOyBpIDxpTGVuOyBpICsrKSB7XG4gICAgICAgIGZvcihsZXQgaiA9IDE7IGogPCBhcmd1bWVudHMubGVuZ3RoOyBqICsrKSB7XG4gICAgICAgICAgcmF0aW5nSXRlbVtpXS5jbGFzc0xpc3QuYWRkKGFyZ3VtZW50c1tqXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIFxuICAgIGZ1bmN0aW9uIG1vdXNlT3ZlckFjdGl2ZUNsYXNzKGFycil7XG4gICAgICBmb3IobGV0IGkgPSAwLCBpTGVuID0gYXJyLmxlbmd0aDsgaSA8IGlMZW47IGkrKykge1xuICAgICAgICBpZihhcnJbaV0uY2xhc3NMaXN0LmNvbnRhaW5zKCdhY3RpdmUnKSl7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1lbHNlIHtcbiAgICAgICAgICBhcnJbaV0uY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIFxuICAgIGZ1bmN0aW9uIG1vdXNlT3V0QWN0aXZlQ2xhcyhhcnIpe1xuICAgICAgZm9yKGxldCBpID0gYXJyLmxlbmd0aC0xOyBpID49MTsgaS0tKSB7XG4gICAgICAgIGlmKGFycltpXS5jbGFzc0xpc3QuY29udGFpbnMoJ2N1cnJlbnQtYWN0aXZlJykpe1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9ZWxzZSB7XG4gICAgICAgICAgYXJyW2ldLmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59KSgpOyIsIjsoZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgY29uc3QgJHNsaWRlcnMgPSAkKCdbanMtc3dpcGVyLXNsaWRlcl0nKTtcblxuICBpZiAoJHNsaWRlcnMubGVuZ3RoKSB7XG4gICAgJHNsaWRlcnMuZWFjaChmdW5jdGlvbihpZHgpIHtcbiAgICAgIGNvbnN0ICRzbGlkZXIgPSAkKHRoaXMpO1xuICAgICAgJHNsaWRlci5hZGRDbGFzcyhgc3dpcGVyLSR7aWR4fWApO1xuICAgICAgXG4gICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICBzbGlkZXNQZXJWaWV3OiA0LFxuICAgICAgICBzcGFjZUJldHdlZW46IDMwLFxuICAgICAgICBhdXRvUmVzaXplOiBmYWxzZSxcbiAgICAgICAgbmF2aWdhdGlvbjoge1xuICAgICAgICAgIG5leHRFbDogJy5wcm9kdWN0c19fYnV0dG9uX25leHQnLFxuICAgICAgICAgIHByZXZFbDogJy5wcm9kdWN0c19fYnV0dG9uX3ByZXYnXG4gICAgICAgIH0sXG4gICAgICAgIHNjcm9sbGJhcjoge1xuICAgICAgICAgIGVsOiAnLnByb2R1Y3RzX19zY3JvbGxiYXInLFxuICAgICAgICAgIGRyYWdnYWJsZTogdHJ1ZVxuICAgICAgICB9LFxuICAgICAgICBicmVha3BvaW50czoge1xuICAgICAgICAgIDExMDA6IHtcbiAgICAgICAgICAgIHNsaWRlc1BlclZpZXc6IDNcbiAgICAgICAgICB9LFxuICAgICAgICAgIDg0NToge1xuICAgICAgICAgICAgc2xpZGVzUGVyVmlldzogMlxuICAgICAgICAgIH0sXG4gICAgICAgICAgNzIxOiB7XG4gICAgICAgICAgICBzcGFjZUJldHdlZW46IDE1XG4gICAgICAgICAgfSxcbiAgICAgICAgICA1NTA6IHtcbiAgICAgICAgICAgIHNsaWRlc1BlclZpZXc6IDEsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIFxuICAgICAgY29uc3Qgc2xpZGVyID0gbmV3IFN3aXBlcihgLnN3aXBlci0ke2lkeH1gLCBvcHRpb25zKTtcblxuICAgIH0pO1xuXG4gIH1cbn0oKSk7IiwiOyhmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGNvbnN0ICR0YWJzID0gJCgnW2pzLXRhYnNdJyk7XG5cbiAgaWYgKCR0YWJzLmxlbmd0aCkge1xuICAgICR0YWJzLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICBjb25zdCAkdGFiID0gJCh0aGlzKTtcbiAgICAgICR0YWIucmVzcG9uc2l2ZVRhYnMoe1xuICAgICAgICBzdGFydENvbGxhcHNlZDogJ2FjY29yZGlvbidcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG59KSgpOyIsIjsoZnVuY3Rpb24oKSB7XG4gIGNvbnN0ICRidXR0b25zID0gJCgnLmpzLXRpcCcpO1xuXG4gIGlmICgkYnV0dG9ucy5sZW5ndGgpIHtcbiAgICRidXR0b25zLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgJGJ1dHRvbiA9ICQodGhpcyk7XG4gICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgIHpJbmRleDogMyxcbiAgICAgIGNvbnRlbnRBc0hUTUw6IHRydWUsXG4gICAgICBjb250ZW50OiAn0J/RgNC+0YHRgtC+INC/0YDQtdC00YHRgtCw0LLRjNGC0LXRgdGMINC4INC+0YHRgtCw0LLRjNGC0LUg0L3QvtC80LXRgCDRgdCy0L7QtdCz0L4g0YLQtdC70LXRhNC+0L3QsC4g0JzQtdC90LXQtNC20LXRgCDQv9C10YDQtdC30LLQvtC90LjRgiDQstCw0Lwg0Lgg0YPRgtC+0YfQvdC40YIg0LLRgdGOINC90LXQtNC+0YHRgtCw0Y7RidGD0Y4g0LjQvdGE0L7RgNC80LDRhtC40Y4uJyxcbiAgICB9O1xuICAgIC8vINCf0YDQvtGB0YLQviDQv9GA0LXQtNGB0YLQsNCy0YzRgtC10YHRjCDQuCDQvtGB0YLQsNCy0YzRgtC1INC90L7QvNC10YAg0YHQstC+0LXQs9C+INGC0LXQu9C10YTQvtC90LAuINCc0LXQvdC10LTQttC10YAg0L/QtdGA0LXQt9Cy0L7QvdC40YIg0LLQsNC8INC4INGD0YLQvtGH0L3QuNGCINCy0YHRjiDQvdC10LTQvtGB0YLQsNGO0YnRg9GOINC40L3RhNC+0YDQvNCw0YbQuNGOLlxuICAgICRidXR0b24udG9vbHRpcHN0ZXIob3B0aW9ucyk7XG4gICB9KTtcbiAgfVxufSkoKTsiLCI7KGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgY29uc3QgJGZvcm1zID0gJCgnW2pzLWZvcm1dJyk7XG5cbiAgaWYgKCRmb3Jtcy5sZW5ndGgpIHtcblxuICAgIGNvbnN0IG1hc2tzID0ge1xuICAgICAgdGVsOiAnKzcgKDk5OSkgLSA5OTkgLSA5OSA5OScsXG4gICAgICB0ZXh0OiAnW2EtekEtWtCQLdCv0LAt0Y8gXSonXG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGluaXRJbnB1dE1hc2soJGlucHV0LCBhdHRyTmFtZSkge1xuICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcbiAgICAgICAgcmVtb3ZlTWFza09uU3VibWl0OiB0cnVlLFxuICAgICAgICBjbGVhckluY29tcGxldGU6IHRydWVcbiAgICAgIH07XG4gICAgICBzd2l0Y2ggKGF0dHJOYW1lKSB7XG4gICAgICAgIGNhc2UgJ3RlbCc6XG4gICAgICAgICAgJGlucHV0LmlucHV0bWFzayh7XG4gICAgICAgICAgICBtYXNrOiBtYXNrc1thdHRyTmFtZV0sXG4gICAgICAgICAgICAuLi5vcHRpb25zLCBcbiAgICAgICAgICAgIG9uY29tcGxldGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAkKHRoaXMpLmJsdXIoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ25hbWUnOlxuICAgICAgICAgICRpbnB1dC5pbnB1dG1hc2soe3JlZ2V4OiBtYXNrcy50ZXh0LCAuLi5vcHRpb25zfSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgJGZvcm1zLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICBjb25zdCAkZm9ybSA9ICQodGhpcyk7XG4gICAgICBjb25zdCAkaW5wdXRzID0gJGZvcm0uZmluZCgnaW5wdXQsIHRleHRhcmVhJyk7XG4gICAgICBjb25zdCAkc3VibWl0ID0gJGZvcm0uZmluZCgnYnV0dG9uW3R5cGU9XCJzdWJtaXRcIl0nKTtcblxuICAgICAgJGlucHV0cy5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zdCAkaW5wdXQgPSAkKHRoaXMpO1xuICAgICAgICBjb25zdCBhdHRyTmFtZSA9ICRpbnB1dC5hdHRyKCduYW1lJyk7XG4gICAgICAgIGluaXRJbnB1dE1hc2soJGlucHV0LCBhdHRyTmFtZSk7XG5cbiAgICAgICAgc3dpdGNoIChhdHRyTmFtZSkge1xuICAgICAgICAgIGNhc2UgJ21lc3NhZ2UnOlxuICAgICAgICAgICAgJGlucHV0Lm9mZignaW52YWxpZCcpLm9uKCdpbnZhbGlkJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgIGNvbnN0IHsgdmFsaWRpdHkgfSA9IGV2ZW50LnRhcmdldDtcbiAgICAgICAgICAgICAgaWYgKHZhbGlkaXR5LnRvb1Nob3J0KSB7XG4gICAgICAgICAgICAgICAgZXZlbnQudGFyZ2V0LnNldEN1c3RvbVZhbGlkaXR5KCfQotC10LrRgdGCINGB0L7QvtCx0YnQtdC90LjRjyDQtNC+0LvQttC10L0g0YHQvtGB0YLQvtGP0YLRjCDQvNC40L3QuNC80YPQvCDQuNC3IDUg0YHQuNC80LLQvtC70L7QsicpO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKHZhbGlkaXR5LnZhbHVlTWlzc2luZykge1xuICAgICAgICAgICAgICAgIGV2ZW50LnRhcmdldC5zZXRDdXN0b21WYWxpZGl0eSgn0J3QsNC/0LjRiNC40YLQtSwg0LPQtNC1INC+0YjQuNCx0LrQsCDQuNC70Lgg0LLQsNGI0Lgg0L/QvtC20LXQu9Cw0L3QuNGPJyk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXZlbnQudGFyZ2V0LnNldEN1c3RvbVZhbGlkaXR5KCcnKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBcbiAgICAgICAgICBjYXNlICduYW1lJzpcbiAgICAgICAgICAgICRpbnB1dC5vZmYoJ2ludmFsaWQnKS5vbignaW52YWxpZCcsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICBjb25zdCB7IHZhbGlkaXR5IH0gPSBldmVudC50YXJnZXQ7XG5cbiAgICAgICAgICAgICAgaWYgKHZhbGlkaXR5LnRvb1Nob3J0KSB7XG4gICAgICAgICAgICAgICAgZXZlbnQudGFyZ2V0LnNldEN1c3RvbVZhbGlkaXR5KCfQmNC80Y8g0LTQvtC70LbQvdC+INGB0L7RgdGC0L7Rj9GC0Ywg0LzQuNC90LjQvNGD0Lwg0LjQtyAyINGB0LjQvNCy0L7Qu9C+0LInKTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmICh2YWxpZGl0eS52YWx1ZU1pc3NpbmcpIHtcbiAgICAgICAgICAgICAgICBldmVudC50YXJnZXQuc2V0Q3VzdG9tVmFsaWRpdHkoJ9CS0LLQtdC00LjRgtC1INCy0LDRiNC1INC40LzRjycpO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKHZhbGlkaXR5LnBhdHRlcm5NaXNtYXRjaCkge1xuICAgICAgICAgICAgICAgIGV2ZW50LnRhcmdldC5zZXRDdXN0b21WYWxpZGl0eSgn0JIg0L/QvtC70LUg0L3QtSDQtNC+0LvQttC90L4g0LHRi9GC0Ywg0YfQuNGB0LXQuyDQuCDQt9C90LDQutC+0LInKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBldmVudC50YXJnZXQuc2V0Q3VzdG9tVmFsaWRpdHkoJycpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgY2FzZSAnZW1haWwnOiBcbiAgICAgICAgICAgICRpbnB1dC5vZmYoJ2ludmFsaWQnKS5vbignaW52YWxpZCcsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICBjb25zdCB7IHZhbGlkaXR5IH0gPSBldmVudC50YXJnZXQ7XG4gICAgICAgICAgICAgIGlmICh2YWxpZGl0eS52YWx1ZU1pc3NpbmcpIHtcbiAgICAgICAgICAgICAgICBldmVudC50YXJnZXQuc2V0Q3VzdG9tVmFsaWRpdHkoJ9CS0LLQtdC00LjRgtC1INCy0LDRiNGDINGN0LvQtdC60YLRgNC+0L3QvdGD0Y4g0L/QvtGH0YLRgycpO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKHZhbGlkaXR5LnR5cGVNaXNtYXRjaCkge1xuICAgICAgICAgICAgICAgIGV2ZW50LnRhcmdldC5zZXRDdXN0b21WYWxpZGl0eSgn0JDQtNGA0LXRgSDRjdC70LXQutGC0YDQvtC90L3QvtC5INC/0L7Rh9GC0Ysg0LTQvtC70LbQtdC9INGB0L7QvtGC0LLQtdGC0YHRgtCy0L7QstCw0YLRjCDRhNC+0YDQvNCw0YLRgzogwqthYmNAYWJjLmNvbcK7Jyk7XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsaWRpdHkucGF0dGVybk1pc21hdGNoKSB7XG4gICAgICAgICAgICAgICAgZXZlbnQudGFyZ2V0LnNldEN1c3RvbVZhbGlkaXR5KCfQkNC00YDQtdGBINGN0LvQtdC60YLRgNC+0L3QvdC+0Lkg0L/QvtGH0YLRiyDQtNC+0LvQttC10L0g0YHQvtC+0YLQstC10YLRgdGC0LLQvtCy0LDRgtGMINGE0L7RgNC80LDRgtGDOiDCq2FiY0BhYmMuY29twrsnKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBldmVudC50YXJnZXQuc2V0Q3VzdG9tVmFsaWRpdHkoJycpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICBicmVhaztcblxuICAgICAgICAgIGNhc2UgJ3RlbCc6XG4gICAgICAgICAgICAkaW5wdXQub2ZmKCdpbnZhbGlkJykub24oJ2ludmFsaWQnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgY29uc3Qge3RhcmdldH0gPSBldmVudDtcbiAgICAgICAgICAgICAgY29uc3QgeyB2YWxpZGl0eSB9ID0gdGFyZ2V0O1xuXG4gICAgICAgICAgICAgIGlmICh2YWxpZGl0eS52YWx1ZU1pc3NpbmcpIHtcbiAgICAgICAgICAgICAgICBldmVudC50YXJnZXQuc2V0Q3VzdG9tVmFsaWRpdHkoJ9Cd0L7QvNC10YAg0YLQtdC70LXRhNC+0L3QsCDQtNC+0LvQttC10L0g0YHQvtGB0YLQvtGP0YLRjCDQuNC3IDExINGG0LjRhNGAJyk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXZlbnQudGFyZ2V0LnNldEN1c3RvbVZhbGlkaXR5KCcnKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbn0pKCk7IiwiOyhmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGNvbnN0ICRpdGVtcyA9ICQoJ1tqcy16b29tXScpO1xuXG4gIGlmICgkaXRlbXMubGVuZ3RoICYmICQoJ2JvZHknKS53aWR0aCgpID49IDEwMDApIHtcbiAgICAkaXRlbXMuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgIGNvbnN0ICRpdGVtID0gJCh0aGlzKTtcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICAgIHVybDogZmFsc2UsXG4gICAgICAgIG1hZ25pZnk6IDEuNSxcbiAgICAgICAgdG91Y2g6IGZhbHNlXG4gICAgICB9O1xuXG4gICAgICAkaXRlbS56b29tKG9wdGlvbnMpO1xuICAgIH0pO1xuICAgIGNvbnNvbGUubG9nKCQoJ2JvZHknKS53aWR0aCgpKVxuICB9XG5cbn0pKCk7Il19
