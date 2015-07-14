(function() {

  var totalDeletedTickets = [];

  return {

    requests: {

      search: function(data_type, query, page) {
        return {
          url: helpers.fmt('/api/v2/search.json?query=type:%@ %@&sort_by=created_at&sort_order=desc&page=%@', data_type, query, page)
        };
      },

      deleteItBatch: function(ids_to_remove) {
        return {
          url: '/api/v2/tickets/destroy_many.json?ids=' + ids_to_remove,
          type: 'DELETE'
        };
      },

      nextPage: function(next_page_url) {
        return {
          url: next_page_url,
          type: 'GET'
        };
      }

    },

    events: {
      // Lifecycle Events
      'app.created': 'init',

      // AJAX Events, Callbacks & error handling
      'search.done': 'onSearchDone',
      'search.fail': 'showError',
      'nextPage.done': 'deleteOtherPages',
      'nextPage.fail': 'showError',

      // UI Events
      'click button.search': 'searchData',
      'click button#delete': 'triggerModal',
      'click button.delete_button': 'deleteHandler',
      'click .go_back': 'init'
    },

    init: function() {
      this.totalDeletedTickets = totalDeletedTickets = [];
      this.switchTo('1_search_screen');
      var default_value = (this.setting('default')) ? this.setting('default') : "status:closed";
      this.$('.main_search input').val(default_value);
    },

    searchData: function(e) {
      if (e) {e.preventDefault();}

      var data_type = this.$('.delete_only')
        .val();
      var query = this.$('#input')
        .val();

      if (query.length < 2) {
        services.notify( this.I18n.t('notifications.searchError'), "error" );
      } else {
        this.$('.loading')
          .show();
        this.ajax('search', data_type, query, 1);
      }
    },

    onSearchDone: function(response) {
      this.search_response = response;
      if ( !response  ) { return; }
      if (response.count === 0) {

        this.$('#search_results, .some_results, #delete, .loading')
          .hide();
        this.$('#results, .no_results')
          .show(); // show no result message

      } else {

        this.$('.table_header')
          .nextAll()
          .html(''); // clean results
        this.$('.no_results, .loading')
          .hide();
        this.$('#search_results, #results, .some_results, #delete')
          .show(); // show results

        var outcome = (response.count <= 20) ? response.count : 20; // show 20 or less results
        var results_html = [];
        var deleteAllRecords = this.I18n.t('notifications.delete-all');

        _(outcome)
          .times(function(n) {
            results_html.push('<tr class="table_rows"><td>' + response.results[n].id + '</td><td>' + response.results[n].subject.substring(0, 100) + '</td><td>' + response.results[n].status + '</td><td>' + response.results[n].created_at + '</td></tr>');
            if (outcome === n + 1) {
              this.$('#search_results')
                .append(results_html);
              this.$('button#delete')
                .text(deleteAllRecords + ' (' + response.count + ')' );
            }
          });
      }
    },

    triggerModal: function() { // insert required info into modal
      this.$('.my_modal_label')
        .text('Delete all records? (' + this.search_response.count + ')');
      this.$('.modal-body p')
        .text( this.I18n.t('notifications.you-are-about-to-delete') );
    },

    deleteHandler: function() {
      this.switchTo('3_loading');
      services.notify( this.I18n.t('notifications.deleting'), 'notice' );

      var ids_to_remove = this.idsToRemove(this.search_response.results);
      this.deleteRecords(ids_to_remove);

      if (!this.search_response.next_page) {
        this.switchTo('4_done', {
          total: _.flatten(totalDeletedTickets)
            .length,
          tickets: totalDeletedTickets,
        });
      } else {
        this.nextPageHandler(this.search_response.next_page);
      }
    },

    nextPageHandler: function(next_page_url) {
      this.ajax('nextPage', next_page_url);
    },

    deleteOtherPages: function(data) {
      var ids_to_remove = this.idsToRemove(data.results);
      this.deleteRecords(ids_to_remove);
      if (data.next_page) {
        this.nextPageHandler(data.next_page);
      } else {
        this.switchTo('4_done', {
          total: _.flatten(totalDeletedTickets)
            .length,
          tickets: totalDeletedTickets,
        });
      }
    },

    deleteRecords: function(ids_to_remove) {
      console.log( this.I18n.t('notifications.being-deleted') + ids_to_remove );
      this.ajax('deleteItBatch', ids_to_remove);
      totalDeletedTickets.push(ids_to_remove);
    },

    idsToRemove: function(search_result_per_page) {
      var record_ids = [];
      _.map(search_result_per_page, function(ticket_data) {
        record_ids.push(ticket_data.id);
      });
      return record_ids;
    },

    showError: function(jqXHR, textStatus) {
      console.log(jqXHR);
      console.log(textStatus);
      var msg = this.I18n.t('notifications.failed-request') + jqXHR + " | " + textStatus;
      console.log(msg);
      //services.notify(msg, 'error');
    }
  };
}());
