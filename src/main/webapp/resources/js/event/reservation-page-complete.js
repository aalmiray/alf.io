(function() {
	
	'use strict';
	
	$(function() {

		var initListeners = function() {
			$(".update-ticket-owner").click(function() {
				$($(this).attr('href')).show().find("input:first").focus();
				return false;
			});


			$(".cancel-update").click(function() {
				$('#' + $(this).attr('data-for-form')).hide();
			});


			$("[data-dismiss=alert]").click(function() {
				$(this).parent().hide('medium');
			});


			$("select").map(function() {
				if($(this).attr('value').length > 0) {
					$(this).find("option[value="+$(this).attr('value')+"]").attr('selected','selected');
				}
			});

			$('.loading').hide();

			var activeForms = $('form.show-by-default');
			if(activeForms.length === 0) {
				$('#back-to-event-site').removeClass('hidden');
			}

			$('.submit-assignee-data').click(function() {
				var frm = $(this.form);
				var action = frm.attr('action');
				var uuid = frm.attr('data-ticket-uuid');
				frm.find('.has-error').removeClass('has-error');
				$('#generic-'+uuid+'-error').removeClass('show');
				if (!frm[0].checkValidity()) {
					return true;//trigger the HTML5 error messages. Thanks to Abraham http://stackoverflow.com/a/11867013
				}
				$('#loading-'+uuid).show();
				$('#buttons-bar-'+uuid).hide();
				jQuery.ajax({
					url: action,
					type: 'POST',
					data: frm.serialize(),
					success: function(result) {
						var validationResult = result.validationResult;
						if(validationResult.success) {
							$('#ticket-detail-'+uuid).replaceWith(result.partial);
							initListeners();
						} else {
							validationResult.validationErrors.forEach(function(error) {
								var element = frm.find('[name='+error.fieldName+']').parents('.form-group');
								if(element.length > 0) {
									element.addClass('has-error');
								} else {
									$('#generic-'+uuid+'-error').addClass('show');
								}
							});
						}
					},
					complete: function() {
						$('#loading-'+uuid).hide();
						$('#buttons-bar-'+uuid).show();
					}
				});
				return false;
			});
		};

		initListeners();
	});
	
	
	
	
})();