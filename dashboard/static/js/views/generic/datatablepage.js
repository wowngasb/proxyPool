define(["views/generic/page", "underscore", "jquery"],function(Page, _, $) {

  var noop = function() {};

 /**
   * A page with a main DataTable instance bound to this.col
   *
   */
  var dataTablePage = Page.extend({
    tryFixThSort: function(oSettings) {
      oSettings.aoColumns.map(function(col){
        if(col.sClass && col.sSortField){
          $('th.' + col.sClass).data('sfield', col.sSortField);
        } else {
          $('th.' + col.sClass).removeClass('sorting').removeClass('sorting_asc').removeClass('sorting_desc');
        }
      });
    },
    tryFixQueryData: function(aoData) {
      var self = this;
      function _findSortArgs(arr, sk, sv){
        sk = sk || 'iSortCol_0';
        sv = sv || 'sSortDir_0';
        var kidx = arr.findIndex(function(i){
          return i.name == sk;
        });
        var ret = {
          field: '',
          direction: ''
        };
        if(kidx >= 0){
          var colIdx = arr[kidx].value;
          var col = $(self.el).find('th')[colIdx];
          ret.field = col && $(col).data('sfield') || '';
          var vidx = arr.findIndex(function(i){
            return i.name == sv;
          });
          var tmp = vidx >= 0 ? arr[vidx] : {value: 'asc'};
          ret.direction = tmp.value == 'desc' ? 'desc' : 'asc';
        }
        return ret;
      }
      var sort_option = _findSortArgs(aoData);
      if(sort_option && sort_option.field && sort_option.direction){
        console.log('_findSortArgs', sort_option);

        aoData.push({
          name: 'sSortField',
          value: sort_option.field
        });
        aoData.push({
          name: 'sSortDirection',
          value: sort_option.direction
        });
      }
      return aoData;
    },

    alwaysRenderOnShow:true,

    init: function() {
      var self = this;

      dataTablePage.__super__.init.apply(self);
      this.filters = {};

      this.loading = false;

      this.delegateEvents(_.extend({
        "click .js-datatable-filters-submit": "filterschanged"
      }, this.events));

      this.on("show", function() {
        this.listenTo(this.app.rootView, "visibilitychange", this.refreshDataTable);

        // Wait before the DOM is actually shown before rendering the datatable (width adjustment)
        setTimeout(function() {
          self.renderDatatable();
        }, 100);

      }, this);

      this.on("hide", function() {
        this.stopListening();
      }, this);

      this.initFilters();

    },

    initFilters: function() {
      // Overload me!
    },

    getCommonDatatableConfig:function(unit_name) {

      var self = this;

      return {
        "sPaginationType": "full_numbers",
        "iDisplayLength":20,
        "fnDrawCallback":function(oSettings) {
          self.tryFixThSort && self.tryFixThSort(oSettings);

          self.hookDrawCallback && self.hookDrawCallback(oSettings);
          
          var num = Math.ceil(oSettings._iRecordsDisplay / oSettings._iDisplayLength);
          self.$('.el-page-num').text(num + ' 页');
          //self.$('.js-datatable .tooltip-top').tooltip();
          //self.$(".dataTables_filter input").prop("type","search").attr("results","10").attr("placeholder","Search products...");
        },
        //"bLengthChange":false,
        //"aLengthMenu": [[25, 50, 100], [25, 50, 100]],
        "sDom":"iprtipl",
        "oLanguage":{
          "sSearch":"",
          "sInfo": "Showing _START_ to _END_ of _TOTAL_ "+unit_name,
          "sEmptyTable":"No "+unit_name,
          "sInfoEmpty":"Showing 0 "+unit_name,
          "sInfoFiltered": "",
          "sLengthMenu": '<select style="width:60px;font-size:13px;height:26px;">'+
            '<option value="20">20</option>'+
            '<option value="50">50</option>'+
            '<option value="100">100</option>'+
            '</select>'
        },
        "sPaginationType": "bs_full",
        "bProcessing": true,
        "bServerSide": true,
        "bDeferRender": true,
        "bDestroy": true,
        "sAjaxSource": "/api/datatables/"+unit_name,
        "fnServerData": function (sSource, aoData, fnCallback) {
          self.loading = true;
          _.each(self.filters, function(v, k) {
            aoData.push({"name": k, "value": v});
          });

          if(self.tryFixQueryData){
            aoData = self.tryFixQueryData(aoData)
          }

          $.getJSON( sSource, aoData, function (json) {
            self.dataTableRawData = json;
            fnCallback(json);
          }).always(function() {
            self.loading = false;
            self.trigger("loaded");
          });
        }
      };
    },



    initDataTable:function(config) {

      var self = this;

      this.dataTable = this.$(".js-datatable").dataTable(config);

      this.dataTableRawData = [];

      // SEARCH - Add the placeholder for Search and Turn this into in-line form control
      var search_input = this.dataTable.closest('.dataTables_wrapper').find('div[id$=_filter] input');
      search_input.attr('placeholder', 'Search');
      search_input.addClass('form-control input-sm');
      // LENGTH - Inline-Form control
      var length_sel = this.dataTable.closest('.dataTables_wrapper').find('div[id$=_length] select');
      length_sel.addClass('form-control input-sm');

      if (this.col) {
        this.col.on("remove",function(m,c,options) {
          noop(m,c); //required for jshint :/
          if (this.dataTable) {
            this.dataTable.fnDeleteRow(options.index);
          }
        },this);
        this.col.on("add",function(m,c/*,options*/) {
          noop(c); //required for jshint :/
          if (this.dataTable) {
            this.dataTable.fnAddData([m.toJSON()]);
          }
        },this);
      }

      this.dataTable.fnSetFilteringDelay();

      setTimeout(function() {
        self.refreshDataTable(true);
      }, 1000);

    },

    getRefreshInterval:function() {

      var interval = parseInt($(".js-autorefresh").val(), 10) * 1000;
      interval = interval <= 0 ? 9999999 : interval;

      if (!this.app.rootView.isTabVisible) {
        interval = 0;
      }

      return interval;

    },

    queueDataTableRefresh:function() {

      var self = this;

      var interval = self.getRefreshInterval();

      if (!interval) return console.log("cancel queue");

      clearTimeout(self.refreshDataTableTimeout);
      self.refreshDataTableTimeout = setTimeout(function() {
        self.refreshDataTable();
      }, interval);

    },

    refreshDataTable:function(justQueue) {

      if (!this.dataTable) return this.flush();

      var self = this;

      var el = self.$(".js-datatable");

      // We may have navigated away in the meantime
      if (!el.is(":visible")) return;

      // Don't reload when a modal is shown
      if ($(".modal:visible").length) {
        $(".modal:visible").trigger("poll");
        justQueue = true;
      }

      // Don't reload when user is selecting text
      if (window.getSelection && window.getSelection().extentOffset > 0 && window.getSelection().type == "Range") {
        justQueue = true;
      }

      // Don't do multiple ajax requests at the same time
      if (self.loading) {
        justQueue = true;
      }

      if (justQueue) {
        self.queueDataTableRefresh();
      } else {

        this.once("loaded", function() {
          self.queueDataTableRefresh();
        });

        // This will call fnDraw which will reload the data
        this.dataTable.fnAdjustColumnSizing();
      }

    },

    renderFilters: function() {
      var self = this;

      if (!this._rendered) return;

      // if (this.filters["manufacturer"]) {
      //   this.$('.js-filter-manufacturer .js-filter-txt').html("Manufacturer: "+this.filters["manufacturer"]["name"]);
      // }

    },

    filterschanged:function(evt) {

      var self = this;

      if (evt) {
        evt.preventDefault();
        evt.stopPropagation();
      }

      _.each(self.filters, function(v, k) {
        var field = self.$(".js-datatable-filters-"+k);
        if (field.is(':checkbox')) {
          self.filters[k] = field.is(':checked')?"1":"";
        } else {
          self.filters[k] = field.val();
        }
      });

      this.refreshDataTable();
    },

    render: function() {
      this.renderTemplate({"filters": this.filters||{}});

      this.renderFilters();

      return this;
    }

      /*

      TODO

      this.col.on("change",function() {
        if (this.dataTable) this.dataTable.fnReloadAjax();
      },this);
      */

  });

  return dataTablePage;
});
