package com.example.geumjeongsan.service;

import com.example.geumjeongsan.domain.notification.*;
import com.example.geumjeongsan.domain.notification.ContactNetworkRepository;
import com.example.geumjeongsan.domain.notification.NotificationSubscriptionRepository;
import com.example.geumjeongsan.domain.notification.NotificationRecipientRepository;
import com.example.geumjeongsan.domain.staff.StaffUser;
import com.example.geumjeongsan.domain.staff.StaffUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {
    
    private final ContactNetworkRepository contactNetworkRepository;
    private final NotificationSubscriptionRepository subscriptionRepository;
    private final NotificationRecipientRepository recipientRepository;
    private final StaffUserRepository staffUserRepository;
    
    // 외부 연락처 관리
    public List<ContactNetwork> getAllContacts() {
        return contactNetworkRepository.findAll();
    }
    
    public ContactNetwork createContact(ContactNetwork contact) {
        return contactNetworkRepository.save(contact);
    }
    
    public void deleteContact(Long contactId) {
        contactNetworkRepository.deleteById(contactId);
    }
    
    // 알림 구독 관리 (직원)
    @Transactional
    public NotificationSubscription subscribeStaff(Long userId, String incidentType) {
        var existing = subscriptionRepository.findByUserIdAndIncidentType(userId, incidentType);
        if (existing.isPresent()) {
            var sub = existing.get();
            sub.setIsEnabled(true);
            return subscriptionRepository.save(sub);
        }
        
        var subscription = new NotificationSubscription();
        subscription.setUserId(userId);
        subscription.setIncidentType(incidentType);
        subscription.setIsEnabled(true);
        return subscriptionRepository.save(subscription);
    }
    
    @Transactional
    public void unsubscribeStaff(Long userId, String incidentType) {
        subscriptionRepository.deleteByUserIdAndIncidentType(userId, incidentType);
    }
    
    // 알림 구독 관리 (외부 연락처)
    @Transactional
    public NotificationSubscription subscribeContact(Long contactId, String incidentType) {
        // 외부 연락처 존재 여부 확인
        if (contactId == null) {
            throw new IllegalArgumentException("Contact ID cannot be null");
        }
        
        var contactOpt = contactNetworkRepository.findById(contactId);
        if (contactOpt.isEmpty()) {
            throw new IllegalArgumentException("Contact with ID " + contactId + " does not exist");
        }
        
        var existing = subscriptionRepository.findByContactIdAndIncidentType(contactId, incidentType);
        if (existing.isPresent()) {
            var sub = existing.get();
            sub.setIsEnabled(true);
            return subscriptionRepository.save(sub);
        }
        
        var subscription = new NotificationSubscription();
        subscription.setContactId(contactId);
        subscription.setUserId(null); // 외부 연락처는 user_id를 null로 설정
        subscription.setIncidentType(incidentType);
        subscription.setIsEnabled(true);
        return subscriptionRepository.save(subscription);
    }
    
    @Transactional
    public void unsubscribeContact(Long contactId, String incidentType) {
        subscriptionRepository.deleteByContactIdAndIncidentType(contactId, incidentType);
    }
    
    // 알림 수신자 조회 (VIEW 활용)
    public List<NotificationRecipient> getAllRecipients() {
        return recipientRepository.findAll();
    }
    
    public List<NotificationRecipient> getRecipientsByIncidentType(String incidentType) {
        return recipientRepository.findByIncidentType(incidentType);
    }
    
    public List<NotificationRecipient> getRecipientsByType(String recipientType) {
        return recipientRepository.findByRecipientType(recipientType);
    }
    
    // 활성 직원 목록 조회
    @Transactional(readOnly = true)
    public List<StaffUser> getActiveStaff() {
        return staffUserRepository.findAll().stream()
            .filter(staff -> staff.getIsActive() != null && staff.getIsActive())
            .collect(Collectors.toList());
    }
}

