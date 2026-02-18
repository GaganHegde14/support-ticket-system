import django_filters

from .models import Ticket


class TicketFilter(django_filters.FilterSet):
    """FilterSet for ticket list endpoint with combinable filters."""

    category = django_filters.ChoiceFilter(choices=Ticket.Category.choices)
    priority = django_filters.ChoiceFilter(choices=Ticket.Priority.choices)
    status = django_filters.ChoiceFilter(choices=Ticket.Status.choices)

    class Meta:
        model = Ticket
        fields = ["category", "priority", "status"]
