from rest_framework import viewsets
from rest_framework import filters
from .models import CompanyDrive
from .serializers import CompanyDriveSerializer

class CompanyDriveViewSet(viewsets.ModelViewSet):
    queryset = CompanyDrive.objects.all()
    serializer_class = CompanyDriveSerializer
    # Filters: Order by drive_date, search by role or domain
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    ordering_fields = ['drive_date'] # Allows ?ordering=drive_date or ?ordering=-drive_date
    search_fields = ['role', 'domain', 'company_name'] # Allows ?search=Software+Engineer