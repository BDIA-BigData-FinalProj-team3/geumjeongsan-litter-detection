package com.example.geumjeongsan.controller;

import com.example.geumjeongsan.domain.notification.*;
import com.example.geumjeongsan.domain.staff.StaffUser;
import com.example.geumjeongsan.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {
    
    private final NotificationService notificationService;
    
    // 외부 연락처 API
    @GetMapping("/contacts")
    public ResponseEntity<List<ContactNetwork>> getAllContacts() {
        return ResponseEntity.ok(notificationService.getAllContacts());
    }
    
    @PostMapping("/contacts")
    public ResponseEntity<ContactNetwork> createContact(@RequestBody ContactNetwork contact) {
        return ResponseEntity.ok(notificationService.createContact(contact));
    }
    
    @DeleteMapping("/contacts/{contactId}")
    public ResponseEntity<Void> deleteContact(@PathVariable Long contactId) {
        notificationService.deleteContact(contactId);
        return ResponseEntity.ok().build();
    }
    
    // 알림 구독 API (직원)
    @PostMapping("/subscriptions/staff")
    public ResponseEntity<NotificationSubscription> subscribeStaff(
            @RequestParam Long userId,
            @RequestParam String incidentType) {
        return ResponseEntity.ok(notificationService.subscribeStaff(userId, incidentType));
    }
    
    @DeleteMapping("/subscriptions/staff")
    public ResponseEntity<Void> unsubscribeStaff(
            @RequestParam Long userId,
            @RequestParam String incidentType) {
        notificationService.unsubscribeStaff(userId, incidentType);
        return ResponseEntity.ok().build();
    }
    
    // 알림 구독 API (외부 연락처)
    @PostMapping("/subscriptions/contact")
    public ResponseEntity<NotificationSubscription> subscribeContact(
            @RequestParam Long contactId,
            @RequestParam String incidentType) {
        return ResponseEntity.ok(notificationService.subscribeContact(contactId, incidentType));
    }
    
    @DeleteMapping("/subscriptions/contact")
    public ResponseEntity<Void> unsubscribeContact(
            @RequestParam Long contactId,
            @RequestParam String incidentType) {
        notificationService.unsubscribeContact(contactId, incidentType);
        return ResponseEntity.ok().build();
    }
    
    // 알림 수신자 조회 API (VIEW)
    @GetMapping("/recipients")
    public ResponseEntity<List<NotificationRecipient>> getAllRecipients() {
        return ResponseEntity.ok(notificationService.getAllRecipients());
    }
    
    @GetMapping("/recipients/incident/{incidentType}")
    public ResponseEntity<List<NotificationRecipient>> getRecipientsByIncidentType(
            @PathVariable String incidentType) {
        return ResponseEntity.ok(notificationService.getRecipientsByIncidentType(incidentType));
    }
    
    @GetMapping("/recipients/type/{recipientType}")
    public ResponseEntity<List<NotificationRecipient>> getRecipientsByType(
            @PathVariable String recipientType) {
        return ResponseEntity.ok(notificationService.getRecipientsByType(recipientType));
    }
    
    // 활성 직원 목록 조회 API
    @GetMapping("/staff/active")
    public ResponseEntity<List<StaffUser>> getActiveStaff() {
        return ResponseEntity.ok(notificationService.getActiveStaff());
    }
}

