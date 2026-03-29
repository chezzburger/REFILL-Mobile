from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Order, OrderItem, OrderNote, Notification
from .serializers import OrderSerializer, OrderItemSerializer, OrderNoteSerializer, NotificationSerializer


class OrderViewSet(viewsets.ModelViewSet):

    serializer_class   = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            qs = Order.objects.filter(is_hidden_by_user=False)
        else:
            qs = Order.objects.filter(user=user, is_hidden_by_user=False)

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        return qs.prefetch_related('items', 'order_notes')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order = serializer.save(user=request.user)

        items_data  = request.data.get('items', [])
        item_errors = []
        for i, item in enumerate(items_data):
            item_ser = OrderItemSerializer(data=item)
            if item_ser.is_valid():
                item_ser.save(order=order)
            else:
                item_errors.append({f"item[{i}]": item_ser.errors})

        order.compute_total()

        response_data = OrderSerializer(order, context={'request': request}).data
        if item_errors:
            response_data['item_warnings'] = item_errors

        return Response(response_data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        order = self.get_object()

        if order.user != request.user and not request.user.is_staff:
            raise PermissionDenied("You can only edit your own orders.")

        serializer = self.get_serializer(order, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        order = self.get_object()

        if order.user != request.user and not request.user.is_staff:
            raise PermissionDenied("You can only delete your own orders.")

        if order.status in ['shipped', 'delivered']:
            return Response(
                {"error": f"Cannot delete an order with status '{order.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.delete() 
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        order = self.get_object()

        if order.user != request.user and not request.user.is_staff:
            raise PermissionDenied("You can only cancel your own orders.")

        if order.status in ['shipped', 'delivered', 'cancelled']:
            return Response(
                {"error": f"Cannot cancel an order with status '{order.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = 'cancelled'
        order.save(update_fields=['status'])
        return Response({"message": f"Order #{order.id} cancelled."})

    @action(detail=True, methods=['post'], url_path='hide') 
    def hide(self, request, pk=None):
        """Hide an order from the user's history (soft delete)"""
        order = self.get_object()

        if order.user != request.user:
            return Response({'detail': 'Not allowed.'}, status=status.HTTP_403_FORBIDDEN)

        order.is_hidden_by_user = True
        order.save()
        return Response({'detail': 'Order hidden.'}, status=status.HTTP_200_OK)


class OrderItemViewSet(viewsets.ModelViewSet):

    serializer_class   = OrderItemSerializer
    permission_classes = [IsAuthenticated]

    def _get_order(self):
        try:
            order = Order.objects.get(pk=self.kwargs['order_pk'])
        except Order.DoesNotExist:
            raise NotFound("Order not found.")
        if order.user != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied("You do not have access to this order.")
        return order

    def get_queryset(self):
        return OrderItem.objects.filter(order=self._get_order())

    def perform_create(self, serializer):
        order = self._get_order()

        if order.status in ['delivered', 'cancelled']:
            raise PermissionDenied(
                f"Cannot add items to an order with status '{order.status}'."
            )
        serializer.save(order=order)
        order.compute_total()

    def partial_update(self, request, *args, **kwargs):
        item = self.get_object()

        serializer = self.get_serializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        item.order.compute_total()
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        item  = self.get_object()
        order = item.order

        if order.status in ['shipped', 'delivered']:
            return Response(
                {"error": "Cannot remove items from a shipped or delivered order."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item.delete()
        order.compute_total()
        return Response(status=status.HTTP_204_NO_CONTENT)


class OrderNoteViewSet(viewsets.ModelViewSet):

    serializer_class   = OrderNoteSerializer
    permission_classes = [IsAuthenticated]

    def _get_order(self):
        try:
            order = Order.objects.get(pk=self.kwargs['order_pk'])
        except Order.DoesNotExist:
            raise NotFound("Order not found.")
        if order.user != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied("You do not have access to this order.")
        return order

    def get_queryset(self):
        return OrderNote.objects.filter(order=self._get_order())

    def perform_create(self, serializer):
        order = self._get_order()

        note_type = self.request.data.get('note_type', 'customer')
        if note_type == 'staff' and not self.request.user.is_staff:
            raise PermissionDenied("Only staff members can create staff notes.")

        serializer.save(order=order, author=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        note = self.get_object()

        if note.author != request.user and not request.user.is_staff:
            raise PermissionDenied("You can only edit your own notes.")

        serializer = self.get_serializer(note, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        note = self.get_object()

        if note.author != request.user and not request.user.is_staff:
            raise PermissionDenied("You can only delete your own notes.")

        note.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class   = NotificationSerializer
    permission_classes = [IsAuthenticated]
 
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)
 
    def partial_update(self, request, *args, **kwargs):
        notif = self.get_object()
        is_read = request.data.get('is_read')
        if is_read is not None:
            notif.is_read = bool(is_read)
            notif.save(update_fields=['is_read'])
        return Response(NotificationSerializer(notif).data)
 
    @action(detail=False, methods=['post'], url_path='mark_all_read')
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'status': 'all notifications marked as read'})